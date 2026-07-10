package com.nexhire.controller;

import com.nexhire.dto.SelectedUserResponse;
import com.nexhire.service.EmployeeSelectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Candidates whose BGC cleared and Employee+SelectedUser were auto-created — the pool
 *  Phase 5/6's Joining/Training Batch wizards select from. */
@RestController
@RequestMapping("/api/selected")
@RequiredArgsConstructor
public class SelectedUserController {

    private final EmployeeSelectionService employeeSelectionService;

    @GetMapping
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<SelectedUserResponse>> getAll() {
        return ResponseEntity.ok(employeeSelectionService.getAllSelected());
    }
}
