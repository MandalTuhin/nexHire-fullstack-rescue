package com.nexhire.controller;

import com.nexhire.dto.CandidateProfileRequest;
import com.nexhire.dto.CandidateProfileResponse;
import com.nexhire.service.CandidateProfileService;
import com.nexhire.service.FileStorageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidate/profile")
@RequiredArgsConstructor
public class CandidateProfileController {

    private final CandidateProfileService profileService;

    @GetMapping
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<CandidateProfileResponse> getMyProfile(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    @PutMapping
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<CandidateProfileResponse> updateMyProfile(
            @Valid @RequestBody CandidateProfileRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(profileService.updateProfile(userId, request));
    }

    @PostMapping(value = "/resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<CandidateProfileResponse> uploadMyResume(
            @RequestParam("file") MultipartFile file, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(profileService.uploadResume(userId, file));
    }

    @GetMapping("/resume")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<ByteArrayResource> downloadMyResume(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return fileResponse(profileService.downloadResume(userId));
    }

    /** HR/ADMIN: view a candidate's profile (application review, BGC review, etc). */
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public ResponseEntity<CandidateProfileResponse> getCandidateProfile(@PathVariable Long userId) {
        return ResponseEntity.ok(profileService.getProfile(userId));
    }

    @GetMapping("/{userId}/resume")
    @PreAuthorize("hasAnyRole('HR', 'ADMIN')")
    public ResponseEntity<ByteArrayResource> downloadCandidateResume(@PathVariable Long userId) {
        return fileResponse(profileService.downloadResume(userId));
    }

    private ResponseEntity<ByteArrayResource> fileResponse(FileStorageService.StoredFileData data) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(data.fileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(data.fileName()).build().toString())
                .body(new ByteArrayResource(data.data()));
    }
}
