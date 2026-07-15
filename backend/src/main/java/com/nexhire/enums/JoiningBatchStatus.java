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
 *
 * CAUTION when renaming or removing a value here: Hibernate auto-generates a Postgres CHECK
 * constraint on joining_batches.status matching whatever this enum looked like the first time
 * the table was created, and ddl-auto=update does NOT retroactively alter that constraint on a
 * later rename. Any existing row still holding the old string breaks with
 * "No enum constant ..." on every read (see GitHub issue #46 — this exact bug happened when
 * COMPLETED_WITH_EXCEPTIONS was renamed to RELEASE_PENDING_LAP). A rename must be paired with a
 * manual data migration (UPDATE ... SET status = 'NEW_NAME' WHERE status = 'OLD_NAME') and a
 * matching ALTER TABLE ... DROP/ADD CONSTRAINT on any environment with existing data.
 */
public enum JoiningBatchStatus {
    CREATED,
    JOINING_LETTER_SENT,
    JOINING_ACCEPTANCE_IN_PROGRESS,
    READY_FOR_TRAINING,
    TRAINING_IN_PROGRESS,
    COMPLETED,
    /**
     * Legacy persisted name for a completed batch with unresolved trainees. Keep this value
     * readable because existing installations may contain it; new transitions use
     * RELEASE_PENDING_LAP. Removing it makes Hibernate fail the entire batch-list query while
     * converting the database string to this enum.
     */
    COMPLETED_WITH_EXCEPTIONS,
    /** Training finished and the Block was already released, but at least one trainee (LAP or
     *  still without an uploaded result) hasn't reached a final outcome yet. */
    RELEASE_PENDING_LAP,
    CLOSED,
    CANCELLED
}
