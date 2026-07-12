package com.nexhire.enums;

/** P-Claude.md section 3 "BUDGET MODULE" — a bank-passbook-style ledger per City. */
public enum BudgetTransactionType {
    /** Admin tops up a city's total training budget. */
    ALLOCATION,
    /** Projected cost reserved when Joining Letters are sent for a batch. */
    RESERVED,
    /** Actual training cost converted from a reservation (or charged directly) at Training Assignment. */
    TRAINING_COST,
    /** The unused portion of a reservation released once actual cost is known. */
    RESERVATION_RELEASED,
    /** Admin manual correction (can be positive or negative). */
    MANUAL_ADJUSTMENT
}
