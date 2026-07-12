package com.nexhire.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Append-only LAP (Learning Assistance Program) event log — P-Claude.md "Do not remove LAP
 * history." Trainee.lapEnabled/finalResult/remarks are still overwritten in place for current
 * state, but every transition is also recorded here so the full history survives repeated
 * toggles (unlike the generic ActivityLog, which is a free-text audit trail, not structured
 * per-trainee history).
 */
@Entity
@Table(name = "lap_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LapHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trainee_id", nullable = false)
    private Trainee trainee;

    @Column(nullable = false)
    private String action;

    @Column(columnDefinition = "TEXT")
    private String remarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "acting_user_id")
    private User actingUser;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
