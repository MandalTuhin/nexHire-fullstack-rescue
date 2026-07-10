package com.nexhire.controller;

import com.nexhire.dto.LocationNameResponse;
import com.nexhire.dto.LocationResponse;
import com.nexhire.dto.LocationUpdateRequest;
import com.nexhire.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<LocationResponse>> getAllLocations() {
        return ResponseEntity.ok(locationService.getAllLocations());
    }

    /** Candidate-facing: just id/name, for the Location Preferences dropdown — deliberately
     *  excludes budget/seat figures (HR planning data) that the full HR-only response above
     *  carries. */
    @GetMapping("/names")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<List<LocationNameResponse>> getLocationNames() {
        return ResponseEntity.ok(locationService.getLocationNames());
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<LocationResponse> updateLocation(
            @PathVariable Long id,
            @RequestBody LocationUpdateRequest request) {
        return ResponseEntity.ok(locationService.updateLocation(id, request));
    }
}
