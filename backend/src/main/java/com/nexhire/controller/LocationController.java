package com.nexhire.controller;

import com.nexhire.dto.LocationNameResponse;
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

    /** Candidate/HR-facing: just id/name, for the Location Preferences and Joining Batch
     *  wizard dropdowns — deliberately excludes budget planning data. See CityController for
     *  the ADMIN/HR-only full City passbook (budget-transactions history lives there too). */
    @GetMapping("/names")
    @PreAuthorize("hasAnyRole('HR', 'EMPLOYEE')")
    public ResponseEntity<List<LocationNameResponse>> getLocationNames() {
        return ResponseEntity.ok(locationService.getLocationNames());
    }
}
