package com.nexhire.service;

import com.nexhire.dto.BudgetTransactionResponse;
import com.nexhire.entity.BudgetTransaction;
import com.nexhire.entity.City;
import com.nexhire.entity.JoiningBatch;
import com.nexhire.entity.User;
import com.nexhire.enums.BudgetTransactionType;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.InsufficientResourceException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.BudgetTransactionRepository;
import com.nexhire.repository.CityRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * P-Claude.md section 5 "BUDGET VALIDATION" — a bank-passbook model per City: reserve the
 * projected cost when Joining Letters are sent (blocking the send if unaffordable), then
 * convert the reservation to actual used budget once real headcount is known at Training
 * Assignment, automatically releasing whatever wasn't spent.
 */
@Service
@RequiredArgsConstructor
public class BudgetService {

    private final CityRepository cityRepository;
    private final BudgetTransactionRepository budgetTransactionRepository;
    private final UserRepository userRepository;

    public List<BudgetTransactionResponse> getHistory(Long cityId) {
        return budgetTransactionRepository.findByCityIdOrderByCreatedAtDesc(cityId).stream()
                .map(this::toResponse).toList();
    }

    /** Reserves `amount` against the city's available budget for this batch. Throws if
     *  insufficient — the caller (JoiningBatchService.sendLetters) must not send letters if
     *  this throws, per P-Claude.md: "If Budget is insufficient, Joining Letters cannot be sent." */
    @Transactional
    public void reserve(City city, long amount, JoiningBatch batch, Long actingUserId) {
        if (city.getAvailableBudget() < amount) {
            throw new InsufficientResourceException(
                    "Insufficient budget at " + city.getName() + ": available Rs." + city.getAvailableBudget()
                            + ", need Rs." + amount);
        }
        city.setReservedBudget(city.getReservedBudget() + amount);
        cityRepository.save(city);

        batch.setReservedBudgetAmount(amount);

        log(city, BudgetTransactionType.RESERVED, amount, batch, actingUserId,
                "Reserved for batch " + batch.getBatchCode());
    }

    /** Releases a reservation in full when its batch is cancelled before training happens —
     *  none of it converts to used, unlike chargeTrainingCost. No-op if nothing was reserved. */
    @Transactional
    public void cancelReservation(City city, JoiningBatch batch, Long actingUserId) {
        Long reserved = batch.getReservedBudgetAmount();
        if (reserved == null || reserved <= 0) return;

        city.setReservedBudget(city.getReservedBudget() - reserved);
        cityRepository.save(city);
        batch.setReservedBudgetAmount(null);

        log(city, BudgetTransactionType.RESERVATION_RELEASED, reserved, batch, actingUserId,
                "Reservation released — batch " + batch.getBatchCode() + " cancelled");
    }

    /** Charges the actual training cost at Training Assignment time. If this batch had a prior
     *  reservation (sendLetters knew the program), converts it: used += actualCost,
     *  reserved -= the full original reservation, and the unspent remainder is logged as
     *  released. If there was no reservation (program wasn't known until now), charges
     *  actualCost directly against available budget, throwing if insufficient. */
    @Transactional
    public void chargeTrainingCost(City city, JoiningBatch batch, long actualCost, Long actingUserId) {
        Long reserved = batch.getReservedBudgetAmount();

        if (reserved != null && reserved > 0) {
            city.setReservedBudget(city.getReservedBudget() - reserved);
            city.setUsedBudget(city.getUsedBudget() + actualCost);
            cityRepository.save(city);

            log(city, BudgetTransactionType.TRAINING_COST, actualCost, batch, actingUserId,
                    "Training cost for batch " + batch.getBatchCode());

            long remainder = reserved - actualCost;
            if (remainder > 0) {
                log(city, BudgetTransactionType.RESERVATION_RELEASED, remainder, batch, actingUserId,
                        "Unused reservation released for batch " + batch.getBatchCode());
            }
        } else {
            if (city.getAvailableBudget() < actualCost) {
                throw new InsufficientResourceException(
                        "Insufficient budget at " + city.getName() + ": available Rs." + city.getAvailableBudget()
                                + ", need Rs." + actualCost);
            }
            city.setUsedBudget(city.getUsedBudget() + actualCost);
            cityRepository.save(city);

            log(city, BudgetTransactionType.TRAINING_COST, actualCost, batch, actingUserId,
                    "Training cost for batch " + batch.getBatchCode() + " (no prior reservation)");
        }
    }

    /** ADMIN: tops up a city's total training budget. */
    @Transactional
    public void allocate(Long cityId, long amount, Long actingUserId, String note) {
        if (amount <= 0) {
            throw new BusinessRuleException("Allocation amount must be positive");
        }
        City city = cityRepository.findById(cityId)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + cityId));
        city.setTotalBudget(city.getTotalBudget() + amount);
        cityRepository.save(city);
        log(city, BudgetTransactionType.ALLOCATION, amount, null, actingUserId, note);
    }

    /** ADMIN: manual correction — amount may be negative (a deduction). */
    @Transactional
    public void manualAdjustment(Long cityId, long amount, Long actingUserId, String note) {
        City city = cityRepository.findById(cityId)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + cityId));
        city.setTotalBudget(city.getTotalBudget() + amount);
        cityRepository.save(city);
        log(city, BudgetTransactionType.MANUAL_ADJUSTMENT, Math.abs(amount), null, actingUserId,
                (amount < 0 ? "Deducted: " : "Added: ") + (note != null ? note : ""));
    }

    private void log(City city, BudgetTransactionType type, long amount, JoiningBatch batch, Long actingUserId, String note) {
        User actingUser = actingUserId != null ? userRepository.findById(actingUserId).orElse(null) : null;
        budgetTransactionRepository.save(BudgetTransaction.builder()
                .city(city)
                .type(type)
                .amount(amount)
                .relatedBatch(batch)
                .createdBy(actingUser)
                .note(note)
                .build());
    }

    private BudgetTransactionResponse toResponse(BudgetTransaction t) {
        return BudgetTransactionResponse.builder()
                .id(t.getId())
                .cityId(t.getCity().getId())
                .type(t.getType().name())
                .amount(t.getAmount())
                .relatedBatchId(t.getRelatedBatch() != null ? t.getRelatedBatch().getId() : null)
                .relatedBatchCode(t.getRelatedBatch() != null ? t.getRelatedBatch().getBatchCode() : null)
                .createdByName(t.getCreatedBy() != null ? t.getCreatedBy().getName() : null)
                .note(t.getNote())
                .createdAt(t.getCreatedAt())
                .build();
    }
}
