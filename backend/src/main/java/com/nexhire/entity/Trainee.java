package com.nexhire.entity;

import com.nexhire.enums.TraineeFinalResult;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "trainees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Trainee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private JobApplication application;

    /** Nullable — old pre-Phase-6 seeded trainees never had a real JoiningBatch. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private JoiningBatch batch;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    // ─── Training result (context.md "TRAINEE RESULT EXCEL UPLOAD" / "LAP FLOW") ──
    private Double score;

    private Double attendancePercentage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private TraineeFinalResult finalResult = TraineeFinalResult.PENDING;

    @Column(nullable = false)
    @Builder.Default
    private Boolean lapEnabled = false;

    @Column(nullable = false)
    @Builder.Default
    private Boolean released = false;

    private String flagReason;

    @Column(columnDefinition = "TEXT")
    private String remarks;
}
