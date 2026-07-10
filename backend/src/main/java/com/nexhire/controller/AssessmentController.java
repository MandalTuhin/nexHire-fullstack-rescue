package com.nexhire.controller;

import com.nexhire.dto.AssessmentRequest;
import com.nexhire.dto.UploadSummaryResponse;
import com.nexhire.entity.AssessmentResult;
import com.nexhire.entity.JobApplication;
import com.nexhire.service.AssessmentExcelService;
import com.nexhire.service.AssessmentService;
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
import java.util.Map;

@RestController
@RequestMapping("/api/assessments")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final AssessmentExcelService assessmentExcelService;

    @PostMapping("/{applicationId}")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<Map<String, Object>> enterScore(
            @PathVariable Long applicationId,
            @Valid @RequestBody AssessmentRequest request,
            Authentication authentication) {
        Long evaluatorId = (Long) authentication.getPrincipal();
        AssessmentResult result = assessmentService.enterScore(applicationId, request, evaluatorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", result.getId(),
                "applicationId", applicationId,
                "score", result.getScore(),
                "remarks", result.getRemarks() != null ? result.getRemarks() : "",
                "status", "ASSESSMENT_SCORE_UPLOADED"
        ));
    }

    @PutMapping("/{applicationId}/qualify")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<Map<String, Object>> qualify(@PathVariable Long applicationId, Authentication authentication) {
        Long actingUserId = (Long) authentication.getPrincipal();
        JobApplication application = assessmentService.qualify(applicationId, actingUserId);
        return ResponseEntity.ok(Map.of(
                "applicationId", application.getId(),
                "status", application.getStatus().name()
        ));
    }

    @PutMapping("/{applicationId}/reject")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<Map<String, Object>> reject(@PathVariable Long applicationId) {
        JobApplication application = assessmentService.reject(applicationId);
        return ResponseEntity.ok(Map.of(
                "applicationId", application.getId(),
                "status", application.getStatus().name()
        ));
    }

    // ─── Bulk Excel workflow ────────────────────────────────────────────────────

    @GetMapping("/excel/template")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<ByteArrayResource> template() {
        byte[] bytes = assessmentExcelService.template();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("assessment-results-template.xlsx").build().toString())
                .body(new ByteArrayResource(bytes));
    }

    @PostMapping(value = "/excel/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<UploadSummaryResponse> validateExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "cutoff", required = false) Double cutoff) {
        return ResponseEntity.ok(assessmentExcelService.validate(file, cutoff));
    }

    @PostMapping(value = "/excel/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<UploadSummaryResponse> commitExcel(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "cutoff", required = false) Double cutoff,
            Authentication authentication) {
        Long actingUserId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(assessmentExcelService.commit(file, cutoff, actingUserId));
    }

    @GetMapping("/excel/history")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<UploadSummaryResponse>> history() {
        return ResponseEntity.ok(assessmentExcelService.history());
    }
}
