package com.nexhire.controller;

import com.nexhire.dto.BudgetAdjustmentRequest;
import com.nexhire.dto.BudgetTransactionResponse;
import com.nexhire.dto.CityRequest;
import com.nexhire.dto.CityResponse;
import com.nexhire.service.BudgetService;
import com.nexhire.service.CityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** ADMIN-facing City CRUD + budget passbook actions (P-Claude.md "CITY MODULE"/"BUDGET MODULE").
 *  Distinct from the older HR-facing /api/locations, which Budget Overview, the candidate
 *  profile's Location Preferences step, and the Joining Batch wizard still use unchanged. */
@RestController
@RequestMapping("/api/cities")
@RequiredArgsConstructor
public class CityController {

    private final CityService cityService;
    private final BudgetService budgetService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<List<CityResponse>> getAll() {
        return ResponseEntity.ok(cityService.getAll());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<CityResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(cityService.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CityResponse> create(@RequestBody CityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(cityService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CityResponse> update(@PathVariable Long id, @RequestBody CityRequest request) {
        return ResponseEntity.ok(cityService.update(id, request));
    }

    @GetMapping("/{id}/budget-transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'HR')")
    public ResponseEntity<List<BudgetTransactionResponse>> getBudgetTransactions(@PathVariable Long id) {
        return ResponseEntity.ok(budgetService.getHistory(id));
    }

    @PostMapping("/{id}/allocate")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> allocate(
            @PathVariable Long id, @Valid @RequestBody BudgetAdjustmentRequest request, Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        budgetService.allocate(id, request.getAmount(), adminId, request.getNote());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> manualAdjustment(
            @PathVariable Long id, @Valid @RequestBody BudgetAdjustmentRequest request, Authentication authentication) {
        Long adminId = (Long) authentication.getPrincipal();
        budgetService.manualAdjustment(id, request.getAmount(), adminId, request.getNote());
        return ResponseEntity.noContent().build();
    }
}
