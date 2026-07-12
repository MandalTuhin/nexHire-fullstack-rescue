package com.nexhire.service;

import com.nexhire.dto.CityRequest;
import com.nexhire.dto.CityResponse;
import com.nexhire.entity.City;
import com.nexhire.enums.CityStatus;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.DuplicateResourceException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.BlockRepository;
import com.nexhire.repository.CityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ADMIN-facing City CRUD (P-Claude.md "CITY MODULE"). Deliberately no hard delete — a City is
 * referenced by Jobs, Joining Batches, candidate location preferences, Blocks and the budget
 * passbook, so "removing" one means deactivating it (status = INACTIVE), not deleting the row.
 * Budget totals aren't editable directly here — see BudgetService.allocate/manualAdjustment,
 * wired into CityController, so every change is captured in the ledger.
 */
@Service
@RequiredArgsConstructor
public class CityService {

    private final CityRepository cityRepository;
    private final BlockRepository blockRepository;

    public List<CityResponse> getAll() {
        return cityRepository.findAll().stream().map(this::toResponse).toList();
    }

    public CityResponse getById(Long id) {
        return toResponse(findCity(id));
    }

    @Transactional
    public CityResponse create(CityRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new BusinessRuleException("City name is required");
        }
        if (cityRepository.existsByName(request.getName().trim())) {
            throw new DuplicateResourceException("A city named '" + request.getName() + "' already exists");
        }

        City city = City.builder()
                .name(request.getName().trim())
                .status(parseStatus(request.getStatus(), CityStatus.ACTIVE))
                .build();

        return toResponse(cityRepository.save(city));
    }

    @Transactional
    public CityResponse update(Long id, CityRequest request) {
        City city = findCity(id);

        if (request.getName() != null && !request.getName().isBlank()) {
            city.setName(request.getName().trim());
        }
        if (request.getStatus() != null) {
            city.setStatus(parseStatus(request.getStatus(), city.getStatus()));
        }

        return toResponse(cityRepository.save(city));
    }

    private City findCity(Long id) {
        return cityRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + id));
    }

    private CityStatus parseStatus(String raw, CityStatus fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            return CityStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Invalid city status: " + raw);
        }
    }

    private CityResponse toResponse(City city) {
        return CityResponse.builder()
                .id(city.getId())
                .name(city.getName())
                .totalBudget(city.getTotalBudget())
                .reservedBudget(city.getReservedBudget())
                .usedBudget(city.getUsedBudget())
                .availableBudget(city.getAvailableBudget())
                .status(city.getStatus().name())
                .blockCount(blockRepository.findByCityId(city.getId()).size())
                .build();
    }
}
