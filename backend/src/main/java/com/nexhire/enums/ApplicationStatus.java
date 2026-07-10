package com.nexhire.enums;

/**
 * Canonical end-to-end lifecycle for a job application, aligned to the full
 * NexHire onboarding pipeline (assessment -> offer -> BGC -> employee/selected-user
 * creation -> joining batch -> training batch -> LAP/release -> project allocation).
 *
 * Not every later-stage value is reachable by the code yet (BGC/joining-batch/training-batch
 * modules land in subsequent phases) — the full vocabulary is defined up front so
 * filters/dashboards/smart-filters built against it don't need to change shape later.
 *
 * JOINING_ON_HOLD is additional to the context.md canonical list, preserved from the
 * existing working budget/seat-hold feature in JoiningLetterService.
 */
public enum ApplicationStatus {
    APPLIED,

    ASSESSMENT_ASSIGNED,
    ASSESSMENT_SCORE_UPLOADED,
    ASSESSMENT_PASSED,
    ASSESSMENT_FAILED,

    OFFER_GENERATED,
    OFFER_SENT,
    OFFER_ACCEPTED,
    OFFER_REJECTED,

    BGC_INITIATED,
    BGC_DOCUMENTS_PENDING,
    BGC_DOCUMENTS_SUBMITTED,
    BGC_VERIFICATION_IN_PROGRESS,
    BGC_CLEARED,
    BGC_FAILED,

    EMPLOYEE_CREATED,
    SELECTED_USER_CREATED,

    JOINING_BATCH_ASSIGNED,
    JOINING_LETTER_GENERATED,
    JOINING_LETTER_SENT,
    JOINING_ON_HOLD,
    JOINING_ACCEPTED,
    JOINING_REJECTED,

    TRAINING_ASSIGNED,
    TRAINING_IN_PROGRESS,
    TRAINING_RESULT_UPLOADED,
    TRAINING_COMPLETED,
    LAP,
    COMPLETED_WITH_EXCEPTIONS,
    RELEASED,

    PROJECT_ASSIGNED,
    ONBOARDED
}
