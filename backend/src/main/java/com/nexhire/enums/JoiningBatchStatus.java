package com.nexhire.enums;

/**
 * The pipeline this build actually drives batches through: CREATED -> JOINING_LETTER_SENT ->
 * JOINING_ACCEPTANCE_IN_PROGRESS -> READY_FOR_TRAINING -> (TrainingBatchService.assignTraining:
 * budget/seat deduction + Trainee creation, in one atomic step — there's no real-world trigger
 * between "assigned" and "in progress" distinct from that single action, so this build doesn't
 * carry a separate ASSIGNED_TO_TRAINING status) -> TRAINING_IN_PROGRESS -> (completeBatch:
 * releases the training Block immediately regardless of LAP) COMPLETED, or RELEASE_PENDING_LAP
 * if any trainee is still unresolved (LAP or no result) when completeBatch runs —
 * RELEASE_PENDING_LAP auto-transitions to COMPLETED the moment every such trainee reaches a
 * final outcome (released or flagged, see TrainingBatchService.checkBatchFullyResolved) ->
 * CLOSED (JoiningBatchService.closeBatch, an explicit HR archival action, only once COMPLETED —
 * a batch with unresolved LAP trainees can't be archived). CANCELLED is reachable from any
 * pre-training state via JoiningBatchService.cancelBatch, which also releases any booked
 * Block/budget reservation.
 */
public enum JoiningBatchStatus {
    CREATED,
    JOINING_LETTER_SENT,
    JOINING_ACCEPTANCE_IN_PROGRESS,
    READY_FOR_TRAINING,
    TRAINING_IN_PROGRESS,
    COMPLETED,
    /** Training finished and the Block was already released, but at least one trainee (LAP or
     *  still without an uploaded result) hasn't reached a final outcome yet. */
    RELEASE_PENDING_LAP,
    CLOSED,
    CANCELLED
}
