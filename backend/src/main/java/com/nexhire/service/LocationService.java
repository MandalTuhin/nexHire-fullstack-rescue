package com.nexhire.service;

import com.nexhire.dto.LocationNameResponse;
import com.nexhire.repository.CityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/** Backs the candidate/HR-facing "location names" dropdown (Location Preferences, Joining
 *  Batch wizard). City CRUD and the budget passbook itself live in CityService/CityController —
 *  this is deliberately just a thin id/name projection, kept separate since it's readable by
 *  EMPLOYEE too (CityController's full response carries HR-only budget planning data). */
@Service
@RequiredArgsConstructor
public class LocationService {

    private final CityRepository locationRepository;

    public List<LocationNameResponse> getLocationNames() {
        return locationRepository.findAll().stream()
                .map(l -> LocationNameResponse.builder()
                        .id(l.getId()).name(l.getName()).city(l.getName()).build())
                .toList();
    }
}
