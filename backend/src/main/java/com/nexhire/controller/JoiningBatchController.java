package com.nexhire.controller;

import com.nexhire.dto.*;
import com.nexhire.service.JoiningBatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/joining-batches")
@RequiredArgsConstructor
@PreAuthorize("hasRole('HR')")
public class JoiningBatchController {

    private final JoiningBatchService joiningBatchService;

    /** Step 4/5 of the wizard: eligible candidates for the chosen joining location, pre-sorted
     *  by location-preference priority (preference 1 first, no-match last). */
    @GetMapping("/eligible")
    public ResponseEntity<List<EligibleJoiningCandidateResponse>> getEligible(
            @RequestParam("joiningLocationId") Long joiningLocationId) {
        return ResponseEntity.ok(joiningBatchService.getEligibleCandidates(joiningLocationId));
    }

    @GetMapping
    public ResponseEntity<List<JoiningBatchResponse>> getAll() {
        return ResponseEntity.ok(joiningBatchService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<JoiningBatchResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(joiningBatchService.getById(id));
    }

    @PostMapping
    public ResponseEntity<JoiningBatchResponse> createBatch(
            @Valid @RequestBody JoiningBatchCreateRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(joiningBatchService.createBatch(request, userId));
    }

    @PostMapping("/auto-create")
    public ResponseEntity<List<JoiningBatchResponse>> autoCreateBatches(
            @Valid @RequestBody JoiningBatchAutoCreateRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(joiningBatchService.autoCreateBatches(request, userId));
    }

    @PostMapping("/{id}/generate-letters")
    public ResponseEntity<JoiningBatchResponse> generateLetters(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningBatchService.generateLetters(id, userId));
    }

    @PostMapping("/{id}/send-letters")
    public ResponseEntity<JoiningBatchResponse> sendLetters(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningBatchService.sendLetters(id, userId));
    }

    /** Cancels a batch before training starts — releases any booked Block/budget reservation. */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<JoiningBatchResponse> cancelBatch(
            @PathVariable Long id,
            @RequestBody(required = false) java.util.Map<String, String> body,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(joiningBatchService.cancelBatch(id, reason, userId));
    }
}
