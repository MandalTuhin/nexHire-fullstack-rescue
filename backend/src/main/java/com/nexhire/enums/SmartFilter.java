package com.nexhire.enums;

/**
 * Server-computed "next stage" presets for the HR Applications page, so HR doesn't have to
 * manually reconstruct multi-field filter combinations to find the next batch of work.
 * NOTE: ELIGIBLE_FOR_BGC and ELIGIBLE_FOR_BATCH are approximated against the current status
 * model (Phase 2) and will be tightened once BgcCase (Phase 4) and JoiningBatch (Phase 5)
 * entities exist with their own eligibility flags.
 */
public enum SmartFilter {
    ELIGIBLE_FOR_ASSESSMENT,
    ASSESSMENT_ASSIGNED,
    ASSESSMENT_PASSED,
    ELIGIBLE_FOR_OFFER,
    OFFER_ACCEPTED,
    ELIGIBLE_FOR_BGC,
    BGC_CLEARED,
    ELIGIBLE_FOR_BATCH
}
