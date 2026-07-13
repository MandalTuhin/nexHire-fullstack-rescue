package com.nexhire.service;

import com.nexhire.dto.RowErrorResponse;
import com.nexhire.dto.UploadSummaryResponse;
import com.nexhire.entity.BulkUploadLog;
import com.nexhire.entity.Employee;
import com.nexhire.entity.JoiningBatch;
import com.nexhire.entity.Trainee;
import com.nexhire.entity.User;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.TraineeFinalResult;
import com.nexhire.enums.UploadStatus;
import com.nexhire.enums.UploadType;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.*;
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
 * Two-phase Excel bulk workflow for trainee results, scoped to a single batch — context.md
 * "TRAINEE RESULT EXCEL UPLOAD". A committed FAILED result moves the trainee straight to LAP
 * (business requirement: "Failed trainees should move to LAP" the moment HR uploads/validates
 * results, not deferred to Complete Batch) — see commit() below, which delegates to
 * TrainingBatchService.doMoveToLap. A committed PASSED/COMPLETED result needs no extra action:
 * it's already the resting "Yet To Release" state Complete Batch releases in bulk.
 */
@Service
@RequiredArgsConstructor
public class TraineeExcelService {

    private static final String[] HEADERS = {"EmployeeId", "TraineeId", "Score", "AttendancePercentage", "FinalResult", "Remarks"};

    private static final String[] EXPORT_HEADERS = {
            "Employee ID", "Trainee ID", "Candidate Name", "Email", "Batch Name",
            "Training Program", "Joining Status", "Training Status",
    };

    private final TraineeRepository traineeRepository;
    private final EmployeeRepository employeeRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final BulkUploadLogRepository uploadLogRepository;
    private final BulkUploadErrorRowRepository errorRowRepository;
    private final AuditLogService auditLogService;
    private final JoiningBatchRepository joiningBatchRepository;
    private final TrainingBatchService trainingBatchService;

    public byte[] template() {
        return ExcelUtil.writeTemplate("Trainee Results", HEADERS, new String[][]{
                {"EMP000001", "1", "82", "95", "PASSED", "Strong performance"},
                {"EMP000002", "2", "48", "70", "FAILED", "Needs improvement"},
        });
    }

    public UploadSummaryResponse validate(Long batchId, MultipartFile file) {
        ParseResult result = parseAndValidate(batchId, file);
        return UploadSummaryResponse.builder()
                .uploadLogId(null)
                .uploadType(UploadType.TRAINEE_RESULT.name())
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
    public UploadSummaryResponse commit(Long batchId, MultipartFile file, Long actingUserId) {
        ParseResult result = parseAndValidate(batchId, file);
        User actor = userRepository.findById(actingUserId).orElseThrow();

        int successCount = 0;
        for (ValidRow row : result.validRows) {
            row.trainee.setScore(row.score);
            row.trainee.setAttendancePercentage(row.attendance);
            row.trainee.setFinalResult(row.finalResult);
            if (row.remarks != null && !row.remarks.isBlank()) {
                row.trainee.setRemarks(row.remarks);
            }
            traineeRepository.save(row.trainee);

            var application = row.trainee.getApplication();
            application.setStatus(ApplicationStatus.TRAINING_RESULT_UPLOADED);
            applicationRepository.save(application);
            successCount++;

            if (row.finalResult == TraineeFinalResult.FAILED) {
                trainingBatchService.doMoveToLap(row.trainee,
                        "Auto-moved to LAP after assessment result upload (FAILED)", actingUserId);
            }
        }

        UploadStatus status = result.totalRows == 0 ? UploadStatus.FAILED
                : result.errors.isEmpty() ? UploadStatus.COMPLETED
                : successCount == 0 ? UploadStatus.FAILED
                : UploadStatus.COMPLETED_WITH_ERRORS;

        BulkUploadLog log = uploadLogRepository.save(BulkUploadLog.builder()
                .uploadType(UploadType.TRAINEE_RESULT)
                .fileName(file.getOriginalFilename())
                .uploadedBy(actor)
                .totalRows(result.totalRows)
                .successRows(successCount)
                .failedRows(result.errors.size())
                .status(status)
                .relatedEntityId(batchId)
                .build());

        for (RowErrorResponse error : result.errors) {
            errorRowRepository.save(com.nexhire.entity.BulkUploadErrorRow.builder()
                    .uploadLog(log)
                    .rowNumber(error.getRowNumber())
                    .identifier(error.getIdentifier())
                    .errorMessage(error.getErrorMessage())
                    .build());
        }

        auditLogService.log(actingUserId, "TRAINEE_RESULT_EXCEL_UPLOAD", "JOINING_BATCH", batchId,
                "Trainee result upload '" + file.getOriginalFilename() + "': "
                        + successCount + " succeeded, " + result.errors.size() + " failed");

        return UploadSummaryResponse.builder()
                .uploadLogId(log.getId())
                .uploadType(UploadType.TRAINEE_RESULT.name())
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

    /** Trainee list export for a batch — the "Trainee ID" column here is exactly the identifier
     *  HR needs to fill in the result-upload template (see HEADERS above), which otherwise has
     *  no way to be looked up without querying the database directly. */
    public byte[] exportTrainees(Long batchId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));

        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batchId))
                .toList();

        List<String[]> rows = new ArrayList<>();
        for (Trainee trainee : trainees) {
            var application = trainee.getApplication();
            Employee employee = employeeRepository.findByApplicationId(application.getId()).orElse(null);
            rows.add(new String[]{
                    employee != null ? employee.getEmployeeCode() : "",
                    String.valueOf(trainee.getId()),
                    trainee.getUser().getName(),
                    trainee.getUser().getEmail(),
                    batch.getBatchName(),
                    batch.getAssignedTraining() != null ? batch.getAssignedTraining().getName() : batch.getTrainingProgram(),
                    "Accepted",
                    trainingStatusLabel(trainee),
            });
        }

        return ExcelUtil.writeRows("Trainees - " + batch.getBatchCode(), EXPORT_HEADERS, rows);
    }

    private String trainingStatusLabel(Trainee trainee) {
        if (Boolean.TRUE.equals(trainee.getReleased())) return "Released";
        // flagReason is only ever set by TrainingBatchService.flagTrainee() — a reliable signal
        // that this is a permanent post-LAP fail, distinct from a plain uploaded FAILED result.
        if (trainee.getFlagReason() != null && !trainee.getFlagReason().isBlank()) return "Flagged";
        if (Boolean.TRUE.equals(trainee.getLapEnabled())) return "LAP";
        return switch (trainee.getFinalResult()) {
            case FAILED -> "Failed";
            case PASSED, COMPLETED -> "Passed (pending release)";
            case LAP -> "LAP";
            case PENDING -> "In Progress";
        };
    }

    public List<UploadSummaryResponse> history(Long batchId) {
        return uploadLogRepository.findByUploadTypeAndRelatedEntityIdOrderByUploadedAtDesc(UploadType.TRAINEE_RESULT, batchId).stream()
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

    private ParseResult parseAndValidate(Long batchId, MultipartFile file) {
        List<ExcelUtil.ExcelRow> rows = ExcelUtil.readSheet(readStream(file));
        List<RowErrorResponse> errors = new ArrayList<>();
        List<ValidRow> validRows = new ArrayList<>();
        Set<Long> seenTraineeIds = new HashSet<>();

        for (ExcelUtil.ExcelRow row : rows) {
            String rawEmployeeId = row.get("EmployeeId");
            String rawTraineeId = row.get("TraineeId");
            String rawScore = row.get("Score");
            String rawAttendance = row.get("AttendancePercentage");
            String rawResult = row.get("FinalResult");
            String remarks = row.get("Remarks");
            String identifier = (rawTraineeId == null || rawTraineeId.isBlank()) ? rawEmployeeId : rawTraineeId;

            Long traineeId;
            try {
                traineeId = Long.parseLong(rawTraineeId == null ? "" : rawTraineeId.trim());
            } catch (Exception e) {
                errors.add(err(row.rowNumber(), identifier, "TraineeId must be a number"));
                continue;
            }

            if (!seenTraineeIds.add(traineeId)) {
                errors.add(err(row.rowNumber(), identifier, "Duplicate TraineeId in file: " + traineeId));
                continue;
            }

            Trainee trainee = traineeRepository.findById(traineeId).orElse(null);
            if (trainee == null) {
                errors.add(err(row.rowNumber(), identifier, "TraineeId not found: " + traineeId));
                continue;
            }

            if (rawEmployeeId == null || rawEmployeeId.isBlank()) {
                errors.add(err(row.rowNumber(), identifier, "EmployeeId is required"));
                continue;
            }
            Employee employee = employeeRepository.findByApplicationId(trainee.getApplication().getId()).orElse(null);
            if (employee == null || !employee.getEmployeeCode().equalsIgnoreCase(rawEmployeeId.trim())) {
                errors.add(err(row.rowNumber(), identifier, "EmployeeId does not match TraineeId " + traineeId));
                continue;
            }

            if (trainee.getBatch() == null || !trainee.getBatch().getId().equals(batchId)) {
                errors.add(err(row.rowNumber(), identifier, "TraineeId " + traineeId + " does not belong to this batch"));
                continue;
            }

            Double score;
            try {
                score = Double.parseDouble(rawScore == null ? "" : rawScore.trim());
            } catch (Exception e) {
                errors.add(err(row.rowNumber(), identifier, "Score must be numeric"));
                continue;
            }

            Double attendance;
            try {
                attendance = Double.parseDouble(rawAttendance == null ? "" : rawAttendance.trim());
            } catch (Exception e) {
                errors.add(err(row.rowNumber(), identifier, "AttendancePercentage must be numeric"));
                continue;
            }

            TraineeFinalResult finalResult = parseFinalResult(rawResult);
            if (finalResult == null) {
                errors.add(err(row.rowNumber(), identifier,
                        "Invalid FinalResult '" + rawResult + "' — expected PASSED, FAILED, LAP or COMPLETED"));
                continue;
            }

            ValidRow valid = new ValidRow();
            valid.trainee = trainee;
            valid.score = score;
            valid.attendance = attendance;
            valid.finalResult = finalResult;
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

    private TraineeFinalResult parseFinalResult(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return TraineeFinalResult.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
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
        Trainee trainee;
        Double score;
        Double attendance;
        TraineeFinalResult finalResult;
        String remarks;
        LinkedHashMap<String, String> raw;
    }

    private static class ParseResult {
        int totalRows;
        List<ValidRow> validRows;
        List<RowErrorResponse> errors;
    }
}
