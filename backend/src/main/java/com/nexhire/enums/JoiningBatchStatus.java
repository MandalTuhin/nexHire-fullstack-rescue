package com.nexhire.enums;

/**
 * context.md "JOINING BATCH MANAGEMENT" lists these 10 statuses. The pipeline this build
 * actually drives them through (documented since the spec text doesn't itself define a
 * strict order): CREATED -> JOINING_LETTER_SENT -> JOINING_ACCEPTANCE_IN_PROGRESS ->
 * READY_FOR_TRAINING -> (Phase 6: budget/seat deduction + Trainee creation) ->
 * ASSIGNED_TO_TRAINING -> TRAINING_IN_PROGRESS -> COMPLETED/COMPLETED_WITH_EXCEPTIONS -> CLOSED,
 * with CANCELLED reachable from any pre-training state. ASSIGNED_TO_TRAINING deliberately
 * comes AFTER acceptance is known, not before — Phase 6's budget/seat deduction needs the
 * final accepted headcount, which isn't known until candidates have responded.
 */
public enum JoiningBatchStatus {
    CREATED,
    JOINING_LETTER_SENT,
    JOINING_ACCEPTANCE_IN_PROGRESS,
    READY_FOR_TRAINING,
    ASSIGNED_TO_TRAINING,
    TRAINING_IN_PROGRESS,
    COMPLETED,
    COMPLETED_WITH_EXCEPTIONS,
    CLOSED,
    CANCELLED
}
