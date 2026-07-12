package com.nexhire.controller;

import com.nexhire.dto.*;
import com.nexhire.service.BgcExcelService;
import com.nexhire.service.BgvService;
import com.nexhire.service.FileStorageService;
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
@RequestMapping("/api/bgv")
@RequiredArgsConstructor
public class BgvController {

    private final BgvService bgvService;
    private final BgcExcelService bgcExcelService;

    /** HR manual fallback — the normal flow auto-initiates on offer acceptance. */
    @PostMapping("/{applicationId}")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BgvResponse> initiate(@PathVariable Long applicationId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bgvService.initiate(applicationId));
    }

    /** HR: paginated/searchable BGC case list (avoids loading every case at once). */
    @GetMapping
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<PageResponse<BgvResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(bgvService.search(search, status, page, size));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<List<BgvResponse>> getMine(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bgvService.getMine(userId));
    }

    @GetMapping("/application/{applicationId}")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<BgvResponse> getByApplication(@PathVariable Long applicationId) {
        return ResponseEntity.ok(bgvService.getByApplication(applicationId));
    }

    /** BGC Detail page: candidate/application/offer info + status + documents + audit history. */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BgcCaseDetailResponse> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(bgvService.getDetail(id));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BgvResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody BgvUpdateRequest request,
            Authentication authentication) {
        Long hrId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bgvService.updateStatus(id, request, hrId));
    }

    // ─── Documents ──────────────────────────────────────────────────────────────

    @PostMapping(value = "/{applicationId}/documents", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<BgcDocumentResponse> uploadDocument(
            @PathVariable Long applicationId,
            @RequestParam("documentType") String documentType,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bgvService.uploadDocument(applicationId, documentType, file, userId));
    }

    @GetMapping("/{applicationId}/documents/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<List<BgcDocumentResponse>> getMyDocuments(
            @PathVariable Long applicationId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bgvService.getMyDocuments(userId, applicationId));
    }

    @GetMapping("/{bgcCaseId}/documents")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<BgcDocumentResponse>> getDocuments(@PathVariable Long bgcCaseId) {
        return ResponseEntity.ok(bgvService.getDocuments(bgcCaseId));
    }

    @PutMapping("/documents/{documentId}/review")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BgcDocumentResponse> reviewDocument(
            @PathVariable Long documentId,
            @Valid @RequestBody BgcDocumentReviewRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bgvService.reviewDocument(documentId, request, userId));
    }

    @GetMapping("/documents/{documentId}/download")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<ByteArrayResource> downloadDocument(
            @PathVariable Long documentId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean isHr = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR"));
        FileStorageService.StoredFileData data = bgvService.downloadDocument(documentId, userId, isHr);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(data.fileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(data.fileName()).build().toString())
                .body(new ByteArrayResource(data.data()));
    }

    // ─── Bulk Excel workflow (BGC results) ───────────────────────────────────────

    @GetMapping("/excel/template")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<ByteArrayResource> template() {
        byte[] bytes = bgcExcelService.template();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("bgc-results-template.xlsx").build().toString())
                .body(new ByteArrayResource(bytes));
    }

    @PostMapping(value = "/excel/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<UploadSummaryResponse> validateExcel(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(bgcExcelService.validate(file));
    }

    @PostMapping(value = "/excel/commit", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<UploadSummaryResponse> commitExcel(
            @RequestParam("file") MultipartFile file, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(bgcExcelService.commit(file, userId));
    }

    @GetMapping("/excel/history")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<UploadSummaryResponse>> history() {
        return ResponseEntity.ok(bgcExcelService.history());
    }
}
