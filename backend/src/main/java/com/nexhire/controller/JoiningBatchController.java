package com.nexhire.controller;

import com.nexhire.dto.*;
import com.nexhire.service.ActivityLogService;
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
    private final ActivityLogService activityLogService;

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

    /** Removes a rejected/expired candidate from the batch so a replacement can be added. */
    @DeleteMapping("/{id}/members/{applicationId}")
    public ResponseEntity<JoiningBatchResponse> removeMember(
            @PathVariable Long id, @PathVariable Long applicationId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningBatchService.removeMember(id, applicationId, userId));
    }

    /** Adds replacement candidate(s) after a removal — HR then calls send-letters again, which
     *  (being incremental) only sends/reserves for these new members. */
    @PostMapping("/{id}/members")
    public ResponseEntity<JoiningBatchResponse> addReplacementMembers(
            @PathVariable Long id, @RequestBody List<Long> applicationIds, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningBatchService.addReplacementMembers(id, applicationIds, userId));
    }

    /** Resends a joining letter to one candidate whose letter expired, resetting their
     *  response deadline, without re-sending to the rest of the batch. */
    @PostMapping("/{id}/members/{applicationId}/resend-letter")
    public ResponseEntity<JoiningBatchResponse> resendLetter(
            @PathVariable Long id, @PathVariable Long applicationId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningBatchService.resendLetter(id, applicationId, userId));
    }

    /** Batch-scoped activity/audit trail for the Batch Details page. */
    @GetMapping("/{id}/activity")
    public ResponseEntity<List<ActivityLogResponse>> getActivity(@PathVariable Long id) {
        return ResponseEntity.ok(activityLogService.getLogsForEntity("JOINING_BATCH", id));
    }
}
