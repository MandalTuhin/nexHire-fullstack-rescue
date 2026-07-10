package com.nexhire.controller;

import com.nexhire.dto.JoiningLetterResponse;
import com.nexhire.service.FileStorageService;
import com.nexhire.service.JoiningLetterService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Individual candidate-facing joining-letter operations. Generation/sending is batch-wise —
 *  see JoiningBatchController. */
@RestController
@RequestMapping("/api/joining-letters")
@RequiredArgsConstructor
public class JoiningLetterController {

    private final JoiningLetterService joiningLetterService;

    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<List<JoiningLetterResponse>> getMyJoiningLetters(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningLetterService.getMyJoiningLetters(userId));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<ByteArrayResource> downloadPdf(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean isHr = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_HR"));
        FileStorageService.StoredFileData data = joiningLetterService.downloadPdf(id, userId, isHr);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(data.fileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(data.fileName()).build().toString())
                .body(new ByteArrayResource(data.data()));
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<JoiningLetterResponse> acceptJoiningLetter(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningLetterService.acceptJoiningLetter(id, userId));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<JoiningLetterResponse> rejectJoiningLetter(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(joiningLetterService.rejectJoiningLetter(id, userId));
    }
}
