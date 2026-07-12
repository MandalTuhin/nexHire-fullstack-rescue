package com.nexhire.enums;

/**
 * The pipeline this build actually drives batches through: CREATED -> JOINING_LETTER_SENT ->
 * JOINING_ACCEPTANCE_IN_PROGRESS -> READY_FOR_TRAINING -> (TrainingBatchService.assignTraining:
 * budget/seat deduction + Trainee creation, in one atomic step — there's no real-world trigger
 * between "assigned" and "in progress" distinct from that single action, so this build doesn't
 * carry a separate ASSIGNED_TO_TRAINING status) -> TRAINING_IN_PROGRESS ->
 * COMPLETED/COMPLETED_WITH_EXCEPTIONS -> CLOSED (JoiningBatchService.closeBatch, an explicit
 * HR archival action). CANCELLED is reachable from any pre-training state via
 * JoiningBatchService.cancelBatch, which also releases any booked Block/budget reservation.
 */
public enum JoiningBatchStatus {
    CREATED,
    JOINING_LETTER_SENT,
    JOINING_ACCEPTANCE_IN_PROGRESS,
    READY_FOR_TRAINING,
    TRAINING_IN_PROGRESS,
    COMPLETED,
    COMPLETED_WITH_EXCEPTIONS,
    CLOSED,
    CANCELLED
}
