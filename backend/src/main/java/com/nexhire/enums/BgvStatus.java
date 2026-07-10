package com.nexhire.enums;

/**
 * Background Verification status — mirrors context.md's BGC MANAGEMENT lifecycle.
 * Verification is performed by a third-party vendor; nexHIRE records and surfaces the
 * status against the application (see ApplicationStatus's parallel BGC_* values).
 */
public enum BgvStatus {
    NOT_INITIATED,
    INITIATED,
    DOCUMENTS_PENDING,
    DOCUMENTS_SUBMITTED,
    VERIFICATION_IN_PROGRESS,
    CLEARED,
    FAILED,
    RECHECK_REQUIRED,
    /** Not in context.md's list; kept as an extra hold state (same precedent as JOINING_ON_HOLD). */
    ON_HOLD
}
