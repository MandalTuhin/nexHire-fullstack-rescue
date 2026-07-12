package com.nexhire.entity;

import com.nexhire.enums.TrainingProgramStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * context.md "LAP FLOW": "Training should have: cutoff_score, minimum_attendance_percentage."
 * P-Claude.md section "TRAINING PROGRAMS": Admin-managed master (Java/Angular/Python/Cloud),
 * HR selects from it while creating batches. This is the catalog HR picks from — distinct from
 * JoiningBatch.trainingProgram, the free-text description some batches still carry from before
 * this catalog existed.
 */
@Entity
@Table(name = "training_programs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrainingProgram {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    /** Free-form, e.g. "8 weeks" — no fixed unit mandated by the spec. */
    private String duration;

    @Column(nullable = false)
    private Long costPerCandidate;

    @Column(nullable = false)
    private Double cutoffScore;

    @Column(nullable = false)
    private Double minimumAttendancePercentage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TrainingProgramStatus status = TrainingProgramStatus.ACTIVE;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
