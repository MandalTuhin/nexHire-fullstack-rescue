package com.nexhire.service;

import com.nexhire.dto.BulkActionResult;
import com.nexhire.dto.OfferRequest;
import com.nexhire.dto.OfferResponse;
import com.nexhire.dto.PageResponse;
import com.nexhire.entity.AssessmentResult;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.OfferLetter;
import com.nexhire.entity.User;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.AssessmentResultRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.OfferLetterRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class OfferService {

    private final OfferLetterRepository offerLetterRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final FileStorageService fileStorageService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final BgvService bgvService;

    /** HR: view all auto-generated offers (offer-generated candidates onward), sorted by score desc. */
    public List<OfferResponse> getAll() {
        return offerLetterRepository.findAll().stream()
                .map(this::toResponse)
                .sorted((a, b) -> {
                    double sa = a.getAssessmentScore() == null ? -1 : a.getAssessmentScore();
                    double sb = b.getAssessmentScore() == null ? -1 : b.getAssessmentScore();
                    return Double.compare(sb, sa);
                })
                .toList();
    }

    /** HR: paginated/searchable offer list, sorted by score desc, avoids loading every offer at once. */
    public PageResponse<OfferResponse> search(String search, String status, int page, int size) {
        String pattern = (search == null || search.isBlank()) ? null : "%" + search.trim().toLowerCase() + "%";
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return PageResponse.of(offerLetterRepository.search(pattern, mapUiStatus(status), pageable), this::toResponse);
    }

    /** Lightweight, full (non-paginated) id list for HR's "Select Top N / Select All" bulk-send
     *  shortcuts, sorted by score desc — independent of the paginated table above so those
     *  actions still operate over the whole eligible set, not just the visible page. */
    public List<Long> getGeneratedApplicationIdsSortedByScore() {
        return offerLetterRepository.findApplicationIdsByStatusOrderByScoreDesc(ApplicationStatus.OFFER_GENERATED);
    }

    /** Maps the frontend's short offer-status vocabulary (GENERATED/SENT/ACCEPTED/REJECTED) to
     *  the underlying ApplicationStatus this service actually stores (mirror of the frontend's
     *  OfferLetterService.mapStatus, inverted). Null/blank/unrecognized -> no filter. */
    private ApplicationStatus mapUiStatus(String status) {
        if (status == null || status.isBlank()) return null;
        return switch (status.trim().toUpperCase()) {
            case "SENT" -> ApplicationStatus.OFFER_SENT;
            case "ACCEPTED" -> ApplicationStatus.OFFER_ACCEPTED;
            case "REJECTED" -> ApplicationStatus.OFFER_REJECTED;
            case "GENERATED" -> ApplicationStatus.OFFER_GENERATED;
            default -> null;
        };
    }

    @Transactional
    public OfferResponse sendOffer(Long applicationId, OfferRequest request, Long sentById) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        OfferLetter offer = offerLetterRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("No auto-generated offer found for this application"));

        if (application.getStatus() != ApplicationStatus.OFFER_GENERATED) {
            throw new InvalidStateTransitionException(
                    "Cannot send offer: application status must be OFFER_GENERATED, current is " + application.getStatus());
        }

        User sentBy = userRepository.findById(sentById)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        offer.setSentBy(sentBy);
        offer.setSentAt(LocalDateTime.now());
        offerLetterRepository.save(offer);

        application.setStatus(ApplicationStatus.OFFER_SENT);
        applicationRepository.save(application);

        auditLogService.log(sentById, "OFFER_SENT", "APPLICATION", applicationId,
                "Offer letter sent to " + application.getUser().getEmail());

        String note = request != null && request.getNote() != null && !request.getNote().isBlank()
                ? ". " + request.getNote() : ". Check your offers.";
        notificationService.notify(application.getUser().getId(), "OFFER_RECEIVED",
                "Offer Letter Received",
                "You have received an offer for " + application.getJob().getTitle() + note);

        return toResponse(offer);
    }

    /** HR: bulk-send offers (top 30/60/manual selection from the offer-generated list). */
    @Transactional
    public BulkActionResult bulkSend(List<Long> applicationIds, Long sentById) {
        int success = 0;
        List<BulkActionResult.Failure> failures = new ArrayList<>();
        for (Long id : applicationIds) {
            try {
                sendOffer(id, OfferRequest.builder().build(), sentById);
                success++;
            } catch (Exception e) {
                failures.add(BulkActionResult.Failure.builder().id(id).reason(e.getMessage()).build());
            }
        }
        return BulkActionResult.builder()
                .totalRequested(applicationIds.size())
                .successCount(success)
                .failureCount(failures.size())
                .failures(failures)
                .build();
    }

    public FileStorageService.StoredFileData downloadPdf(Long offerId, Long requestingUserId, boolean isHr) {
        OfferLetter offer = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + offerId));
        if (!isHr && !offer.getApplication().getUser().getId().equals(requestingUserId)) {
            throw new InvalidStateTransitionException("You can only view your own offer letter");
        }
        if (offer.getPdfFile() == null) {
            throw new ResourceNotFoundException("Offer letter PDF not available");
        }
        return fileStorageService.retrieve(offer.getPdfFile().getId());
    }

    public List<OfferResponse> getMyOffers(Long userId) {
        return offerLetterRepository.findByApplicationUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public OfferResponse acceptOffer(Long offerId, Long userId) {
        OfferLetter offer = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + offerId));

        JobApplication application = offer.getApplication();

        if (application.getStatus() != ApplicationStatus.OFFER_SENT) {
            throw new InvalidStateTransitionException(
                    "Cannot accept offer: application status must be OFFER_SENT, current is " + application.getStatus());
        }

        if (!application.getUser().getId().equals(userId)) {
            throw new InvalidStateTransitionException("You can only accept your own offers");
        }

        application.setStatus(ApplicationStatus.OFFER_ACCEPTED);
        // BGC starts automatically the instant the offer is accepted (context.md: "BGC starts
        // automatically after offer acceptance") — this also advances application.status again.
        bgvService.autoInitiate(application);
        applicationRepository.save(application);

        offer.setRespondedAt(LocalDateTime.now());
        return toResponse(offerLetterRepository.save(offer));
    }

    @Transactional
    public OfferResponse rejectOffer(Long offerId, Long userId) {
        OfferLetter offer = offerLetterRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found with id: " + offerId));

        JobApplication application = offer.getApplication();

        if (application.getStatus() != ApplicationStatus.OFFER_SENT) {
            throw new InvalidStateTransitionException(
                    "Cannot reject offer: application status must be OFFER_SENT, current is " + application.getStatus());
        }

        if (!application.getUser().getId().equals(userId)) {
            throw new InvalidStateTransitionException("You can only reject your own offers");
        }

        application.setStatus(ApplicationStatus.OFFER_REJECTED);
        applicationRepository.save(application);

        offer.setRespondedAt(LocalDateTime.now());
        return toResponse(offerLetterRepository.save(offer));
    }

    private OfferResponse toResponse(OfferLetter offer) {
        JobApplication app = offer.getApplication();
        Double score = assessmentResultRepository.findByApplicationId(app.getId())
                .map(AssessmentResult::getScore).orElse(null);
        return OfferResponse.builder()
                .id(offer.getId())
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .jobTitle(app.getJob().getTitle())
                .assessmentScore(score)
                .content(offer.getContent())
                .pdfFileId(offer.getPdfFile() != null ? offer.getPdfFile().getId() : null)
                .status(app.getStatus().name())
                .generatedAt(offer.getGeneratedAt())
                .sentByName(offer.getSentBy() != null ? offer.getSentBy().getName() : null)
                .sentAt(offer.getSentAt())
                .respondedAt(offer.getRespondedAt())
                .build();
    }
}
