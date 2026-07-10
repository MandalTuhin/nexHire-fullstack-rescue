package com.nexhire.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * context.md "LAP FLOW": "Training should have: cutoff_score, minimum_attendance_percentage."
 * This is the catalog HR picks from at Training Assignment time (distinct from
 * JoiningBatch.trainingProgram, the free-text description captured earlier in the Phase 5
 * wizard, before a real program+budget commitment is made).
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

    @Column(nullable = false)
    private Long costPerCandidate;

    @Column(nullable = false)
    private Double cutoffScore;

    @Column(nullable = false)
    private Double minimumAttendancePercentage;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
