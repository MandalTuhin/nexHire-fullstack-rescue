package com.nexhire.entity;

import com.nexhire.enums.CityStatus;
import jakarta.persistence.*;
import lombok.*;

/**
 * A hiring/training city (renamed in place from the earlier flat "Location" concept — same
 * physical table, same seeded data, no migration script). Owns a budget passbook
 * (total/reserved/used, see BudgetTransaction for the ledger) and one or more physical
 * training rooms (Block).
 */
@Entity
@Table(name = "locations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class City {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    /** Total training budget ever allocated to this city, in ₹. */
    @Column(nullable = false)
    @Builder.Default
    private Long totalBudget = 0L;

    /** Budget reserved (projected cost of joining batches whose letters have been sent but not
     *  yet converted to actual training cost) — see BudgetTransaction. */
    @Column(nullable = false)
    @Builder.Default
    private Long reservedBudget = 0L;

    /** Budget actually consumed (converted from a reservation once training is assigned). */
    @Column(nullable = false)
    @Builder.Default
    private Long usedBudget = 0L;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private CityStatus status = CityStatus.ACTIVE;

    @Transient
    public Long getAvailableBudget() {
        return totalBudget - reservedBudget - usedBudget;
    }
}
