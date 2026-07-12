package com.nexhire.controller;

import com.nexhire.dto.*;
import com.nexhire.service.TraineeExcelService;
import com.nexhire.service.TrainingBatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/training-batches")
@RequiredArgsConstructor
@PreAuthorize("hasRole('HR')")
public class TrainingBatchController {

    private final TrainingBatchService trainingBatchService;
    private final TraineeExcelService traineeExcelService;

    // ─── Candidate self-service ───────────────────────────────────────────────────

    /** EMPLOYEE: the logged-in candidate's own trainee record. */
    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<TraineeDetailResponse> getMyTrainee(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(trainingBatchService.getMyTrainee(userId));
    }

    // ─── Training Program catalog (P-Claude.md: Admin-managed, HR selects at batch time) ─────

    @GetMapping("/programs")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<List<TrainingProgramResponse>> getPrograms() {
        return ResponseEntity.ok(trainingBatchService.getPrograms());
    }

    @PostMapping("/programs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TrainingProgramResponse> createProgram(@Valid @RequestBody TrainingProgramCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(trainingBatchService.createProgram(request));
    }

    @PutMapping("/programs/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TrainingProgramResponse> updateProgram(
            @PathVariable Long id, @RequestBody TrainingProgramUpdateRequest request) {
        return ResponseEntity.ok(trainingBatchService.updateProgram(id, request));
    }

    // ─── Dashboard / Detail / Assignment ─────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<TrainingBatchDashboardResponse>> getDashboard() {
        return ResponseEntity.ok(trainingBatchService.getDashboard());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TrainingBatchDetailResponse> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(trainingBatchService.getDetail(id));
    }

    @PostMapping("/{id}/assign-training")
    public ResponseEntity<TrainingBatchDetailResponse> assignTraining(
            @PathVariable Long id, @Valid @RequestBody AssignTrainingRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(trainingBatchService.assignTraining(id, request, userId));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<TrainingBatchDetailResponse> completeBatch(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(trainingBatchService.completeBatch(id, userId));
    }

    /** Archives a finished batch (COMPLETED/COMPLETED_WITH_EXCEPTIONS -> CLOSED). */
    @PostMapping("/{id}/close")
    public ResponseEntity<TrainingBatchDetailResponse> closeBatch(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(trainingBatchService.closeBatch(id, userId));
    }

    // ─── LAP ────────────────────────────────────────────────────────────────────

    @PostMapping("/trainees/{traineeId}/lap")
    public ResponseEntity<TraineeDetailResponse> moveToLap(
            @PathVariable Long traineeId, @RequestBody(required = false) LapUpdateRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String remarks = request != null ? request.getRemarks() : null;
        return ResponseEntity.ok(trainingBatchService.moveToLap(traineeId, remarks, userId));
    }

    @PostMapping("/trainees/{traineeId}/remove-lap")
    public ResponseEntity<TraineeDetailResponse> removeFromLap(@PathVariable Long traineeId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(trainingBatchService.removeFromLap(traineeId, userId));
    }

    // ─── Trainee result Excel bulk upload (batch-scoped) ─────────────────────────

    @GetMapping("/excel/template")
    public ResponseEntity<ByteArrayResource> template() {
        byte[] bytes = traineeExcelService.template();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("trainee-results-template.xlsx").build().toString())
                .body(new ByteArrayResource(bytes));
    }

    @PostMapping(value = "/{id}/excel/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadSummaryResponse> validateExcel(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(traineeExcelService.validate(id, file));
    }

    @PostMapping(value = "/{id}/excel/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadSummaryResponse> commitExcel(
            @PathVariable Long id, @RequestParam("file") MultipartFile file, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(traineeExcelService.commit(id, file, userId));
    }

    @GetMapping("/{id}/excel/history")
    public ResponseEntity<List<UploadSummaryResponse>> history(@PathVariable Long id) {
        return ResponseEntity.ok(traineeExcelService.history(id));
    }
}
