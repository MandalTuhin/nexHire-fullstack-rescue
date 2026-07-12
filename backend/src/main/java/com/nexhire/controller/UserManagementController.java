package com.nexhire.controller;

import com.nexhire.dto.CreateUserRequest;
import com.nexhire.dto.PageResponse;
import com.nexhire.dto.RoleUpdateRequest;
import com.nexhire.dto.UserResponse;
import com.nexhire.service.UserManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class UserManagementController {

    private final UserManagementService userManagementService;

    /** ADMIN: paginated/searchable user list (avoids loading all ~5000 seeded users at once). */
    @GetMapping
    public ResponseEntity<PageResponse<UserResponse>> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(userManagementService.search(search, role, page, size));
    }

    /** ADMIN: create an internal user (HR/RMG/Admin) with a temporary password. */
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request, Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        return ResponseEntity.status(HttpStatus.CREATED).body(userManagementService.createUser(request, adminId));
    }

    @PutMapping("/{id}/role")
    public ResponseEntity<UserResponse> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody RoleUpdateRequest request,
            Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userManagementService.updateRole(id, request, adminId));
    }

    @PutMapping("/{id}/deactivate")
    public ResponseEntity<UserResponse> deactivate(
            @PathVariable Long id,
            Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userManagementService.deactivate(id, adminId));
    }

    @PutMapping("/{id}/reactivate")
    public ResponseEntity<UserResponse> reactivate(
            @PathVariable Long id,
            Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userManagementService.reactivate(id, adminId));
    }
}
