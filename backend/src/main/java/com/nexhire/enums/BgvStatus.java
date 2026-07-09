package com.nexhire.enums;

/**
 * Background Verification status. Verification is performed by a third-party
 * vendor; nexHIRE records and surfaces the status against the application.
 */
public enum BgvStatus {
    PENDING,
    IN_PROGRESS,
    CLEARED,
    FAILED,
    ON_HOLD
}
