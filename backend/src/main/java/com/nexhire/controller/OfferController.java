package com.nexhire.controller;

import com.nexhire.dto.BulkActionRequest;
import com.nexhire.dto.BulkActionResult;
import com.nexhire.dto.OfferRequest;
import com.nexhire.dto.OfferResponse;
import com.nexhire.service.FileStorageService;
import com.nexhire.service.OfferService;
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

@RestController
@RequestMapping("/api/offers")
@RequiredArgsConstructor
public class OfferController {

    private final OfferService offerService;

    /** HR: all auto-generated offers, sorted by assessment score desc. */
    @GetMapping
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<OfferResponse>> getAll() {
        return ResponseEntity.ok(offerService.getAll());
    }

    @PostMapping("/{applicationId}")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<OfferResponse> sendOffer(
            @PathVariable Long applicationId,
            @Valid @RequestBody(required = false) OfferRequest request,
            Authentication authentication) {
        Long sentById = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(offerService.sendOffer(applicationId, request != null ? request : OfferRequest.builder().build(), sentById));
    }

    /** HR: bulk-send offers (select top 30 / top 60 / manual on the offer-generated list). */
    @PostMapping("/bulk/send")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BulkActionResult> bulkSend(
            @Valid @RequestBody BulkActionRequest request, Authentication authentication) {
        Long sentById = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(offerService.bulkSend(request.getApplicationIds(), sentById));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<List<OfferResponse>> getMyOffers(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(offerService.getMyOffers(userId));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<ByteArrayResource> downloadPdf(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean isHr = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR"));
        FileStorageService.StoredFileData data = offerService.downloadPdf(id, userId, isHr);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(data.fileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(data.fileName()).build().toString())
                .body(new ByteArrayResource(data.data()));
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<OfferResponse> acceptOffer(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(offerService.acceptOffer(id, userId));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<OfferResponse> rejectOffer(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(offerService.rejectOffer(id, userId));
    }
}
