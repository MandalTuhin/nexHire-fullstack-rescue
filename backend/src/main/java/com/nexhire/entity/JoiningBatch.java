package com.nexhire.entity;

import com.nexhire.enums.JoiningBatchStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * context.md "JOINING BATCH MANAGEMENT": joining and training are batch-based, never
 * individual. trainingProgram/block are plain descriptive fields for now — the real backend
 * has no separate Program/Block catalog (only a flat Location + per-location HiringBudget/
 * TrainingSeat), and per-block seat *enforcement* is explicitly Phase 6's "TRAINING
 * ASSIGNMENT" concern, not batch creation.
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
    private Location joiningLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "training_location_id", nullable = false)
    private Location trainingLocation;

    @Column(nullable = false)
    private String trainingProgram;

    private String block;

    private String trainer;

    private LocalDate trainingStartDate;

    private LocalDate trainingEndDate;

    /** Set at Training Assignment time (Phase 6) — the real catalog entry that drives
     *  cutoff/attendance/cost, distinct from the free-text trainingProgram captured earlier. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_training_id")
    private TrainingProgram assignedTraining;

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
