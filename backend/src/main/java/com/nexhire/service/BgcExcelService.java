package com.nexhire.service;

import com.nexhire.dto.RowErrorResponse;
import com.nexhire.dto.UploadSummaryResponse;
import com.nexhire.entity.BackgroundVerification;
import com.nexhire.entity.BulkUploadLog;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.User;
import com.nexhire.enums.BgvStatus;
import com.nexhire.enums.UploadStatus;
import com.nexhire.enums.UploadType;
import com.nexhire.repository.BackgroundVerificationRepository;
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
 * Two-phase Excel bulk workflow for BGC results, uploaded by HR after receiving the vendor's
 * result file (context.md "BGC MANAGEMENT" / "BGC result upload"). Mirrors AssessmentExcelService.
 */
@Service
@RequiredArgsConstructor
public class BgcExcelService {

    private static final String[] HEADERS = {"ApplicationId", "CandidateEmail", "BGCStatus", "Remarks"};

    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final BackgroundVerificationRepository bgvRepository;
    private final BulkUploadLogRepository uploadLogRepository;
    private final BulkUploadErrorRowRepository errorRowRepository;
    private final AuditLogService auditLogService;

    /** Reuses BgvService's package-private applyStatus() so the status-mapping / Employee-creation
     *  logic on CLEARED lives in exactly one place, shared with the individual-update path. */
    private final BgvService bgvService;

    public byte[] template() {
        return ExcelUtil.writeTemplate("BGC Results", HEADERS, new String[][]{
                {"1", "candidate1@nexhire.com", "CLEARED", "All checks passed"},
                {"2", "candidate2@nexhire.com", "FAILED", "Address mismatch"},
        });
    }

    public UploadSummaryResponse validate(MultipartFile file) {
        ParseResult result = parseAndValidate(file);
        return UploadSummaryResponse.builder()
                .uploadLogId(null)
                .uploadType(UploadType.BGC_RESULT.name())
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
    public UploadSummaryResponse commit(MultipartFile file, Long actingUserId) {
        ParseResult result = parseAndValidate(file);
        User actor = userRepository.findById(actingUserId).orElseThrow();

        int successCount = 0;
        for (ValidRow row : result.validRows) {
            bgvService.applyStatus(row.bgcCase, row.mappedStatus, row.remarks, actingUserId);
            bgvRepository.save(row.bgcCase);
            successCount++;
        }

        UploadStatus status = result.totalRows == 0 ? UploadStatus.FAILED
                : result.errors.isEmpty() ? UploadStatus.COMPLETED
                : successCount == 0 ? UploadStatus.FAILED
                : UploadStatus.COMPLETED_WITH_ERRORS;

        BulkUploadLog log = uploadLogRepository.save(BulkUploadLog.builder()
                .uploadType(UploadType.BGC_RESULT)
                .fileName(file.getOriginalFilename())
                .uploadedBy(actor)
                .totalRows(result.totalRows)
                .successRows(successCount)
                .failedRows(result.errors.size())
                .status(status)
                .build());

        for (RowErrorResponse error : result.errors) {
            errorRowRepository.save(com.nexhire.entity.BulkUploadErrorRow.builder()
                    .uploadLog(log)
                    .rowNumber(error.getRowNumber())
                    .identifier(error.getIdentifier())
                    .errorMessage(error.getErrorMessage())
                    .build());
        }

        auditLogService.log(actingUserId, "BGC_EXCEL_UPLOAD", "BULK_UPLOAD_LOG", log.getId(),
                "BGC result upload '" + file.getOriginalFilename() + "': "
                        + successCount + " succeeded, " + result.errors.size() + " failed");

        return UploadSummaryResponse.builder()
                .uploadLogId(log.getId())
                .uploadType(UploadType.BGC_RESULT.name())
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
                .filter(l -> l.getUploadType() == UploadType.BGC_RESULT)
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

    private ParseResult parseAndValidate(MultipartFile file) {
        List<ExcelUtil.ExcelRow> rows = ExcelUtil.readSheet(readStream(file));
        List<RowErrorResponse> errors = new ArrayList<>();
        List<ValidRow> validRows = new ArrayList<>();
        Set<Long> seenApplicationIds = new HashSet<>();

        for (ExcelUtil.ExcelRow row : rows) {
            String rawAppId = row.get("ApplicationId");
            String rawEmail = row.get("CandidateEmail");
            String rawStatus = row.get("BGCStatus");
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

            BackgroundVerification bgcCase = bgvRepository.findByApplicationId(applicationId).orElse(null);
            if (bgcCase == null) {
                errors.add(err(row.rowNumber(), identifier, "No BGC case found for ApplicationId " + applicationId));
                continue;
            }

            BgvStatus mapped = mapBgcStatus(rawStatus);
            if (mapped == null) {
                errors.add(err(row.rowNumber(), identifier,
                        "Invalid BGCStatus '" + rawStatus + "' — expected CLEARED/PASSED/VERIFIED, FAILED, PENDING or RECHECK"));
                continue;
            }

            ValidRow valid = new ValidRow();
            valid.bgcCase = bgcCase;
            valid.mappedStatus = mapped;
            valid.remarks = remarks;
            valid.raw = row.values();
            validRows.add(valid);
        }

        ParseResult result = new ParseResult();
        result.totalRows = rows.size();
        result.validRows = validRows;
        result.errors = errors;
        return result;
    }

    /** Per context.md's exact mapping table. */
    private BgvStatus mapBgcStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        String v = raw.trim().toUpperCase();
        return switch (v) {
            case "CLEARED", "PASSED", "VERIFIED" -> BgvStatus.CLEARED;
            case "FAILED" -> BgvStatus.FAILED;
            case "PENDING" -> BgvStatus.VERIFICATION_IN_PROGRESS;
            case "RECHECK" -> BgvStatus.RECHECK_REQUIRED;
            default -> null;
        };
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
        BackgroundVerification bgcCase;
        BgvStatus mappedStatus;
        String remarks;
        LinkedHashMap<String, String> raw;
    }

    private static class ParseResult {
        int totalRows;
        List<ValidRow> validRows;
        List<RowErrorResponse> errors;
    }
}
