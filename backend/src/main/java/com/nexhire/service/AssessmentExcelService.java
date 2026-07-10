package com.nexhire.service;

import com.nexhire.dto.RowErrorResponse;
import com.nexhire.dto.UploadSummaryResponse;
import com.nexhire.entity.AssessmentResult;
import com.nexhire.entity.BulkUploadLog;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.User;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.UploadStatus;
import com.nexhire.enums.UploadType;
import com.nexhire.repository.AssessmentResultRepository;
import com.nexhire.repository.BulkUploadErrorRowRepository;
import com.nexhire.repository.BulkUploadLogRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.UserRepository;
import com.nexhire.util.ExcelUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;

/**
 * Two-phase Excel bulk workflow for assessment results (context.md "ASSESSMENT MANAGEMENT"):
 * template download -> validate (preview, no writes) -> commit (writes only the valid rows).
 * Stateless between phases — commit re-parses and re-validates the same file rather than
 * trusting client-echoed state.
 */
@Service
@RequiredArgsConstructor
public class AssessmentExcelService {

    private static final String[] HEADERS = {"ApplicationId", "CandidateEmail", "Score", "Result", "Remarks"};

    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final BulkUploadLogRepository uploadLogRepository;
    private final BulkUploadErrorRowRepository errorRowRepository;
    private final OfferGenerationService offerGenerationService;
    private final AuditLogService auditLogService;

    public byte[] template() {
        return ExcelUtil.writeTemplate("Assessment Results", HEADERS, new String[][]{
                {"1", "candidate1@nexhire.com", "78", "PASS", "Strong problem solving"},
                {"2", "candidate2@nexhire.com", "42", "FAIL", ""},
        });
    }

    public UploadSummaryResponse validate(MultipartFile file, Double cutoff) {
        ParseResult result = parseAndValidate(file, cutoff);
        return UploadSummaryResponse.builder()
                .uploadLogId(null)
                .uploadType(UploadType.ASSESSMENT_RESULT.name())
                .fileName(file.getOriginalFilename())
                .uploadedAt(LocalDateTime.now())
                .totalRows(result.totalRows)
                .successRows(result.validRows.size())
                .failedRows(result.errors.size())
                .status((result.errors.isEmpty() ? UploadStatus.COMPLETED : UploadStatus.COMPLETED_WITH_ERRORS).name())
                .errors(result.errors)
                .previewRows(result.validRows.stream().limit(100).map(r -> r.raw).toList())
                .build();
    }

    @Transactional
    public UploadSummaryResponse commit(MultipartFile file, Double cutoff, Long actingUserId) {
        ParseResult result = parseAndValidate(file, cutoff);
        User actor = userRepository.findById(actingUserId).orElseThrow();

        int successCount = 0;
        for (ValidRow row : result.validRows) {
            applyRow(row, actor);
            successCount++;
        }

        UploadStatus status = result.totalRows == 0 ? UploadStatus.FAILED
                : result.errors.isEmpty() ? UploadStatus.COMPLETED
                : successCount == 0 ? UploadStatus.FAILED
                : UploadStatus.COMPLETED_WITH_ERRORS;

        BulkUploadLog log = uploadLogRepository.save(BulkUploadLog.builder()
                .uploadType(UploadType.ASSESSMENT_RESULT)
                .fileName(file.getOriginalFilename())
                .uploadedBy(actor)
                .totalRows(result.totalRows)
                .successRows(successCount)
                .failedRows(result.errors.size())
                .status(status)
                .remarks(cutoff != null ? "Cutoff applied: " + cutoff : null)
                .build());

        for (RowErrorResponse error : result.errors) {
            errorRowRepository.save(com.nexhire.entity.BulkUploadErrorRow.builder()
                    .uploadLog(log)
                    .rowNumber(error.getRowNumber())
                    .identifier(error.getIdentifier())
                    .errorMessage(error.getErrorMessage())
                    .build());
        }

        auditLogService.log(actingUserId, "ASSESSMENT_EXCEL_UPLOAD", "BULK_UPLOAD_LOG", log.getId(),
                "Assessment result upload '" + file.getOriginalFilename() + "': "
                        + successCount + " succeeded, " + result.errors.size() + " failed");

        return UploadSummaryResponse.builder()
                .uploadLogId(log.getId())
                .uploadType(UploadType.ASSESSMENT_RESULT.name())
                .fileName(file.getOriginalFilename())
                .uploadedAt(log.getUploadedAt())
                .totalRows(result.totalRows)
                .successRows(successCount)
                .failedRows(result.errors.size())
                .status(status.name())
                .errors(result.errors)
                .previewRows(List.of())
                .build();
    }

    public List<UploadSummaryResponse> history() {
        return uploadLogRepository.findAll().stream()
                .filter(l -> l.getUploadType() == UploadType.ASSESSMENT_RESULT)
                .sorted((a, b) -> b.getUploadedAt().compareTo(a.getUploadedAt()))
                .map(l -> UploadSummaryResponse.builder()
                        .uploadLogId(l.getId())
                        .uploadType(l.getUploadType().name())
                        .fileName(l.getFileName())
                        .uploadedAt(l.getUploadedAt())
                        .totalRows(l.getTotalRows())
                        .successRows(l.getSuccessRows())
                        .failedRows(l.getFailedRows())
                        .status(l.getStatus().name())
                        .errors(List.of())
                        .previewRows(List.of())
                        .build())
                .toList();
    }

    private void applyRow(ValidRow row, User actor) {
        JobApplication application = row.application;

        AssessmentResult assessmentResult = assessmentResultRepository.findByApplicationId(application.getId())
                .orElseGet(() -> AssessmentResult.builder().application(application).build());
        assessmentResult.setScore(row.score);
        assessmentResult.setRemarks(row.remarks);
        assessmentResult.setEvaluatedBy(actor);
        assessmentResult.setEvaluatedAt(LocalDateTime.now());
        assessmentResultRepository.save(assessmentResult);

        application.setStatus(ApplicationStatus.ASSESSMENT_SCORE_UPLOADED);
        applicationRepository.save(application);

        if (row.passed) {
            application.setStatus(ApplicationStatus.ASSESSMENT_PASSED);
            applicationRepository.save(application);
            offerGenerationService.generateIfAbsent(application, actor.getId());
            applicationRepository.save(application);
        } else {
            application.setStatus(ApplicationStatus.ASSESSMENT_FAILED);
            applicationRepository.save(application);
        }
    }

    private ParseResult parseAndValidate(MultipartFile file, Double cutoff) {
        List<ExcelUtil.ExcelRow> rows = ExcelUtil.readSheet(readStream(file));
        List<RowErrorResponse> errors = new ArrayList<>();
        List<ValidRow> validRows = new ArrayList<>();
        Set<Long> seenApplicationIds = new HashSet<>();

        for (ExcelUtil.ExcelRow row : rows) {
            String rawAppId = row.get("ApplicationId");
            String rawEmail = row.get("CandidateEmail");
            String rawScore = row.get("Score");
            String rawResult = row.get("Result");
            String remarks = row.get("Remarks");
            String identifier = (rawAppId == null || rawAppId.isBlank()) ? rawEmail : rawAppId;

            Long applicationId;
            try {
                applicationId = Long.parseLong(rawAppId == null ? "" : rawAppId.trim());
            } catch (Exception e) {
                errors.add(err(row.rowNumber(), identifier, "ApplicationId must be a number"));
                continue;
            }

            if (!seenApplicationIds.add(applicationId)) {
                errors.add(err(row.rowNumber(), identifier, "Duplicate ApplicationId in file: " + applicationId));
                continue;
            }

            JobApplication application = applicationRepository.findById(applicationId).orElse(null);
            if (application == null) {
                errors.add(err(row.rowNumber(), identifier, "ApplicationId not found: " + applicationId));
                continue;
            }

            if (rawEmail == null || rawEmail.isBlank()) {
                errors.add(err(row.rowNumber(), identifier, "CandidateEmail is required"));
                continue;
            }
            User candidate = userRepository.findByEmail(rawEmail.trim()).orElse(null);
            if (candidate == null) {
                errors.add(err(row.rowNumber(), identifier, "CandidateEmail not found: " + rawEmail));
                continue;
            }
            if (!candidate.getId().equals(application.getUser().getId())) {
                errors.add(err(row.rowNumber(), identifier,
                        "CandidateEmail does not belong to ApplicationId " + applicationId));
                continue;
            }

            // Eligibility (10th/12th/graduation >=60%) is enforced at apply-time, so every
            // APPLIED candidate is already assessment-eligible — no separate manual
            // "assign assessment" gate is needed. ASSESSMENT_ASSIGNED is still accepted for
            // any application that predates this or was assigned through another path.
            if (application.getStatus() != ApplicationStatus.APPLIED
                    && application.getStatus() != ApplicationStatus.ASSESSMENT_ASSIGNED) {
                errors.add(err(row.rowNumber(), identifier,
                        "Application status must be APPLIED or ASSESSMENT_ASSIGNED, current is " + application.getStatus()));
                continue;
            }

            Double score;
            try {
                score = Double.parseDouble(rawScore == null ? "" : rawScore.trim());
            } catch (Exception e) {
                errors.add(err(row.rowNumber(), identifier, "Score must be numeric"));
                continue;
            }

            Boolean passed;
            if (rawResult == null || rawResult.isBlank()) {
                if (cutoff == null) {
                    errors.add(err(row.rowNumber(), identifier,
                            "Result is required (PASS/FAIL), or provide a cutoff score for automatic pass/fail"));
                    continue;
                }
                passed = score >= cutoff;
            } else {
                passed = parseResult(rawResult);
                if (passed == null) {
                    errors.add(err(row.rowNumber(), identifier,
                            "Invalid Result value '" + rawResult + "' — expected PASS or FAIL"));
                    continue;
                }
            }

            ValidRow valid = new ValidRow();
            valid.application = application;
            valid.score = score;
            valid.remarks = remarks;
            valid.passed = passed;
            valid.raw = row.values();
            validRows.add(valid);
        }

        ParseResult result = new ParseResult();
        result.totalRows = rows.size();
        result.validRows = validRows;
        result.errors = errors;
        return result;
    }

    /** Accepts PASS/PASSED/FAIL/FAILED/REJECTED (case-insensitive); blank -&gt; null (cutoff decides). */
    private Boolean parseResult(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String v = raw.trim().toUpperCase();
        if (v.equals("PASS") || v.equals("PASSED")) return true;
        if (v.equals("FAIL") || v.equals("FAILED") || v.equals("REJECTED")) return false;
        return null;
    }

    private RowErrorResponse err(int rowNumber, String identifier, String message) {
        return RowErrorResponse.builder().rowNumber(rowNumber).identifier(identifier).errorMessage(message).build();
    }

    private java.io.InputStream readStream(MultipartFile file) {
        try {
            return file.getInputStream();
        } catch (java.io.IOException e) {
            throw new java.io.UncheckedIOException(e);
        }
    }

    private static class ValidRow {
        JobApplication application;
        Double score;
        String remarks;
        boolean passed;
        LinkedHashMap<String, String> raw;
    }

    private static class ParseResult {
        int totalRows;
        List<ValidRow> validRows;
        List<RowErrorResponse> errors;
    }
}
