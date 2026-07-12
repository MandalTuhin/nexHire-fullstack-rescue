package com.nexhire.entity;

import com.nexhire.enums.JoiningBatchStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * context.md "JOINING BATCH MANAGEMENT": joining and training are batch-based, never
 * individual. trainingProgram/block (free-text) are the wizard's legacy descriptive fields,
 * kept for older batches; trainingBlock is the real Block-catalog FK, booked (see
 * BlockService.bookBlock) the moment the wizard assigns one at batch-creation time and released
 * when the batch completes (TrainingBatchService.completeBatch) — enforcing the one-active-
 * batch-per-block rule for the room's whole occupancy, not just the training-assignment step.
 */
@Entity
@Table(name = "joining_batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoiningBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String batchCode;

    @Column(nullable = false)
    private String batchName;

    @Column(nullable = false)
    private LocalDate joiningDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "joining_location_id", nullable = false)
    private City joiningLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_location_id", nullable = false)
    private City trainingLocation;

    @Column(nullable = false)
    private String trainingProgram;

    private String block;

    /** Real Block-catalog FK — nullable until the wizard is updated to set it (see class javadoc). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_block_id")
    private Block trainingBlock;

    private LocalDate trainingStartDate;

    private LocalDate trainingEndDate;

    /** Set at Training Assignment time (Phase 6) — the real catalog entry that drives
     *  cutoff/attendance/cost, distinct from the free-text trainingProgram captured earlier.
     *  May also be set at batch-creation time if the wizard supplied a trainingProgramId
     *  (see JoiningBatchService.createBatch), which is what lets the budget passbook reserve a
     *  projected cost at Joining-Letter-send time instead of only at Training Assignment. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_training_id")
    private TrainingProgram assignedTraining;

    /** Projected training cost reserved against the training city's budget when Joining Letters
     *  were sent (null if no program was known yet at that point) — see BudgetService. */
    private Long reservedBudgetAmount;

    @Column(nullable = false)
    private Integer batchSize;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private JoiningBatchStatus status = JoiningBatchStatus.CREATED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
