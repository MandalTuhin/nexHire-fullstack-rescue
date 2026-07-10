package com.nexhire.controller;

import com.nexhire.dto.*;
import com.nexhire.service.ApplicationExportService;
import com.nexhire.service.ApplicationSearchService;
import com.nexhire.service.ApplicationService;
import com.nexhire.service.AuditLogService;
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

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor
public class ApplicationController {

    private final ApplicationService applicationService;
    private final ApplicationSearchService applicationSearchService;
    private final ApplicationExportService applicationExportService;
    private final AuditLogService auditLogService;

    @PostMapping
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<ApplicationResponse> apply(
            @RequestBody Map<String, Long> body,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Long jobId = body.get("jobId");
        return ResponseEntity.status(HttpStatus.CREATED).body(applicationService.applyToJob(userId, jobId));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<List<ApplicationResponse>> getMyApplications(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(applicationService.getMyApplications(userId));
    }

    @GetMapping
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<ApplicationResponse>> getAllApplications() {
        return ResponseEntity.ok(applicationService.getAllApplications());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<ApplicationResponse> getApplicationById(@PathVariable Long id) {
        return ResponseEntity.ok(applicationService.getApplicationById(id));
    }

    @PutMapping("/{id}/start-assessment")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<ApplicationResponse> startAssessment(@PathVariable Long id) {
        return ResponseEntity.ok(applicationService.startAssessment(id));
    }

    /** HR: high-volume server-side search/filter/sort/pagination (the main Applications page data source). */
    @PostMapping("/search")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<PageResponse<ApplicationResponse>> search(@RequestBody ApplicationFilterRequest filter) {
        return ResponseEntity.ok(applicationSearchService.search(filter));
    }

    @PostMapping("/bulk/assign-assessment")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BulkActionResult> bulkAssignAssessment(
            @Valid @RequestBody BulkActionRequest request, Authentication authentication) {
        Long hrId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(applicationSearchService.bulkAssignAssessment(request.getApplicationIds(), hrId));
    }

    @PostMapping("/bulk/reject")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BulkActionResult> bulkReject(
            @Valid @RequestBody BulkActionRequest request, Authentication authentication) {
        Long hrId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(applicationSearchService.bulkReject(request.getApplicationIds(), hrId, request.getReason()));
    }

    @PostMapping("/bulk/shortlist")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BulkActionResult> bulkShortlist(
            @Valid @RequestBody BulkActionRequest request, Authentication authentication) {
        Long hrId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(applicationSearchService.bulkShortlist(request.getApplicationIds(), hrId));
    }

    /** HR: export ALL rows matching the current filter (not just the current page) as an Excel workbook. */
    @PostMapping("/export")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<ByteArrayResource> export(@RequestBody ApplicationFilterRequest filter, Authentication authentication) {
        Long hrId = (Long) authentication.getPrincipal();
        List<ApplicationResponse> rows = applicationSearchService.searchAllForExport(filter);
        auditLogService.log(hrId, "BULK_EXPORT", "APPLICATION", null,
                "Exported " + rows.size() + " application row(s) to Excel");
        byte[] bytes = applicationExportService.exportApplications(rows);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("applications-export.xlsx").build().toString())
                .body(new ByteArrayResource(bytes));
    }
}
