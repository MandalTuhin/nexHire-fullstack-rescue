package com.nexhire.service;

import com.nexhire.dto.ApplicationFilterRequest;
import com.nexhire.dto.ApplicationResponse;
import com.nexhire.dto.BulkActionResult;
import com.nexhire.dto.PageResponse;
import com.nexhire.entity.JobApplication;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.BgvStatus;
import com.nexhire.enums.SmartFilter;
import com.nexhire.repository.BackgroundVerificationRepository;
import com.nexhire.repository.CandidateProfileRepository;
import com.nexhire.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * The HR "Applications" automation engine: server-side search/filter/sort/pagination plus
 * bulk status transitions. Kept separate from ApplicationService (which owns the single-record
 * apply/get/start-assessment flows) so the high-volume query path has its own home.
 */
@Service
@RequiredArgsConstructor
public class ApplicationSearchService {

    /** Maps a client-facing sortBy key to a JPQL order expression valid against JobApplicationRepository#search's aliases. */
    private static final Map<String, String> SORT_EXPRESSIONS = Map.of(
            "appliedAt", "a.appliedAt",
            "candidateName", "u.name",
            "score", "ar.score",
            "offerRespondedAt", "ol.respondedAt",
            "bgcCompletedAt", "bv.completedAt",
            "joiningDate", "jl.joiningDate"
    );

    private final JobApplicationRepository applicationRepository;
    private final BackgroundVerificationRepository bgvRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final AuditLogService auditLogService;
    private final OfferGenerationService offerGenerationService;

    public PageResponse<ApplicationResponse> search(ApplicationFilterRequest filter) {
        List<ApplicationStatus> statuses = resolveStatuses(filter);
        BgvStatus bgcStatus = resolveBgcStatus(filter);

        String search = blankToNull(filter.getSearch());
        String searchPattern = search != null ? "%" + search.toLowerCase() + "%" : null;
        String locationPref = blankToNull(filter.getLocationPreference());
        String qualificationPattern = blankToNull(filter.getQualification()) != null
                ? "%" + filter.getQualification().toLowerCase() + "%" : null;

        Pageable pageable = PageRequest.of(
                Math.max(filter.getPage(), 0),
                Math.min(Math.max(filter.getSize(), 1), 200),
                resolveSort(filter));

        var page = applicationRepository.search(
                searchPattern,
                filter.getApplicationId(),
                statuses,
                filter.getProfileCompleted(),
                qualificationPattern,
                locationPref != null ? locationPref.toLowerCase() : null,
                filter.getScoreMin(),
                filter.getScoreMax(),
                bgcStatus,
                pageable);

        return PageResponse.of(page, this::toResponse);
    }

    /** Non-paginated variant for bulk export (still respects all filters, capped at 20k rows for safety). */
    public List<ApplicationResponse> searchAllForExport(ApplicationFilterRequest filter) {
        ApplicationFilterRequest exportFilter = filter.toBuilder().page(0).size(20000).build();
        return search(exportFilter).getContent();
    }

    @Transactional
    public BulkActionResult bulkAssignAssessment(List<Long> applicationIds, Long hrUserId) {
        return bulkTransition(applicationIds, hrUserId, "BULK_ASSIGN_ASSESSMENT",
                List.of(ApplicationStatus.APPLIED), ApplicationStatus.ASSESSMENT_ASSIGNED,
                "assigned to assessment");
    }

    @Transactional
    public BulkActionResult bulkReject(List<Long> applicationIds, Long hrUserId, String reason) {
        return bulkTransition(applicationIds, hrUserId, "BULK_REJECT",
                List.of(ApplicationStatus.APPLIED, ApplicationStatus.ASSESSMENT_ASSIGNED, ApplicationStatus.ASSESSMENT_SCORE_UPLOADED),
                ApplicationStatus.ASSESSMENT_FAILED,
                "rejected" + (reason != null && !reason.isBlank() ? " (" + reason + ")" : ""));
    }

    @Transactional
    public BulkActionResult bulkShortlist(List<Long> applicationIds, Long hrUserId) {
        return bulkTransition(applicationIds, hrUserId, "BULK_SHORTLIST",
                List.of(ApplicationStatus.ASSESSMENT_SCORE_UPLOADED), ApplicationStatus.ASSESSMENT_PASSED,
                "shortlisted (assessment passed)",
                // Auto-generate the offer letter — HR should not have to do this one by one.
                application -> offerGenerationService.generateIfAbsent(application, hrUserId));
    }

    private BulkActionResult bulkTransition(List<Long> applicationIds, Long hrUserId, String actionType,
                                             List<ApplicationStatus> allowedFrom, ApplicationStatus target,
                                             String auditVerb) {
        return bulkTransition(applicationIds, hrUserId, actionType, allowedFrom, target, auditVerb, null);
    }

    private BulkActionResult bulkTransition(List<Long> applicationIds, Long hrUserId, String actionType,
                                             List<ApplicationStatus> allowedFrom, ApplicationStatus target,
                                             String auditVerb, java.util.function.Consumer<JobApplication> onSuccess) {
        List<JobApplication> applications = applicationRepository.findByIdIn(applicationIds);
        Map<Long, JobApplication> byId = new java.util.HashMap<>();
        applications.forEach(a -> byId.put(a.getId(), a));

        int success = 0;
        List<BulkActionResult.Failure> failures = new ArrayList<>();

        for (Long id : applicationIds) {
            JobApplication application = byId.get(id);
            if (application == null) {
                failures.add(BulkActionResult.Failure.builder().id(id).reason("Application not found").build());
                continue;
            }
            if (!allowedFrom.contains(application.getStatus())) {
                failures.add(BulkActionResult.Failure.builder().id(id)
                        .reason("Invalid current status: " + application.getStatus()).build());
                continue;
            }
            application.setStatus(target);
            applicationRepository.save(application);
            if (onSuccess != null) {
                onSuccess.accept(application);
                applicationRepository.save(application);
            }
            auditLogService.log(hrUserId, actionType, "APPLICATION", id,
                    "Application #" + id + " (" + application.getUser().getEmail() + ") " + auditVerb);
            success++;
        }

        return BulkActionResult.builder()
                .totalRequested(applicationIds.size())
                .successCount(success)
                .failureCount(failures.size())
                .failures(failures)
                .build();
    }

    private List<ApplicationStatus> resolveStatuses(ApplicationFilterRequest filter) {
        if (filter.getSmartFilter() != null && !filter.getSmartFilter().isBlank()) {
            SmartFilter sf;
            try {
                sf = SmartFilter.valueOf(filter.getSmartFilter().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                return parseStatuses(filter.getStatuses());
            }
            return switch (sf) {
                case ELIGIBLE_FOR_ASSESSMENT -> List.of(ApplicationStatus.APPLIED);
                case ASSESSMENT_ASSIGNED -> List.of(ApplicationStatus.ASSESSMENT_ASSIGNED);
                case ASSESSMENT_PASSED, ELIGIBLE_FOR_OFFER -> List.of(ApplicationStatus.ASSESSMENT_PASSED);
                case OFFER_ACCEPTED -> List.of(ApplicationStatus.OFFER_ACCEPTED);
                case ELIGIBLE_FOR_BGC -> List.of(ApplicationStatus.OFFER_ACCEPTED, ApplicationStatus.BGC_INITIATED);
                case BGC_CLEARED -> List.of(ApplicationStatus.BGC_CLEARED);
                case ELIGIBLE_FOR_BATCH -> List.of(ApplicationStatus.BGC_CLEARED,
                        ApplicationStatus.EMPLOYEE_CREATED, ApplicationStatus.SELECTED_USER_CREATED);
            };
        }
        return parseStatuses(filter.getStatuses());
    }

    private List<ApplicationStatus> parseStatuses(List<String> raw) {
        if (raw == null || raw.isEmpty()) return null;
        List<ApplicationStatus> statuses = raw.stream()
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return ApplicationStatus.valueOf(s.toUpperCase());
                    } catch (IllegalArgumentException e) {
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull)
                .toList();
        return statuses.isEmpty() ? null : statuses;
    }

    private BgvStatus resolveBgcStatus(ApplicationFilterRequest filter) {
        String raw = "BGC_CLEARED".equalsIgnoreCase(filter.getSmartFilter())
                ? "CLEARED" : blankToNull(filter.getBgcStatus());
        if (raw == null) return null;
        try {
            return BgvStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private Sort resolveSort(ApplicationFilterRequest filter) {
        String key = filter.getSortBy() != null ? filter.getSortBy() : "appliedAt";
        String expr = SORT_EXPRESSIONS.getOrDefault(key, SORT_EXPRESSIONS.get("appliedAt"));
        Sort.Direction dir = "asc".equalsIgnoreCase(filter.getSortDir()) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(dir, expr);
    }

    private String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private ApplicationResponse toResponse(JobApplication app) {
        return ApplicationResponse.builder()
                .id(app.getId())
                .userId(app.getUser().getId())
                .userName(app.getUser().getName())
                .userEmail(app.getUser().getEmail())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .status(app.getStatus().name())
                .holdReason(app.getHoldReason())
                .holdCreatedAt(app.getHoldCreatedAt())
                .holdResolvedAt(app.getHoldResolvedAt())
                .bgvStatus(bgvRepository.findByApplicationId(app.getId())
                        .map(b -> b.getStatus().name()).orElse(null))
                .passoutYear(candidateProfileRepository.findByUserId(app.getUser().getId())
                        .map(p -> p.getGraduationPassingYear()).orElse(null))
                .appliedAt(app.getAppliedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }
}
