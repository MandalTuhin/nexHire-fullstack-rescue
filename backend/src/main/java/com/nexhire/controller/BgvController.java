package com.nexhire.controller;

import com.nexhire.dto.BgvResponse;
import com.nexhire.dto.BgvUpdateRequest;
import com.nexhire.service.BgvService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bgv")
@RequiredArgsConstructor
public class BgvController {

    private final BgvService bgvService;

    /** HR initiates BGV for an application. */
    @PostMapping("/{applicationId}")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BgvResponse> initiate(
            @PathVariable Long applicationId,
            @RequestBody(required = false) Map<String, String> body) {
        String vendor = body != null ? body.getOrDefault("vendorName", "ThirdParty BGV Inc.") : "ThirdParty BGV Inc.";
        return ResponseEntity.status(HttpStatus.CREATED).body(bgvService.initiate(applicationId, vendor));
    }

    /** HR lists all BGV records. */
    @GetMapping
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<BgvResponse>> getAll() {
        return ResponseEntity.ok(bgvService.getAll());
    }

    /** Candidate views own BGV records. */
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

    /**
     * Update BGV status. Represents the third-party vendor result being recorded.
     * HR can trigger this; in a real system a vendor webhook would call it.
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<BgvResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody BgvUpdateRequest request) {
        return ResponseEntity.ok(bgvService.updateStatus(id, request));
    }
}
