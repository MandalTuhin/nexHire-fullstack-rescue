package com.nexhire.entity;

import com.nexhire.enums.BgvStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Background Verification record. Conducted directly by HR — status is surfaced against
 * the application.
 */
@Entity
@Table(name = "background_verifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BackgroundVerification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private JobApplication application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BgvStatus status = BgvStatus.NOT_INITIATED;

    private String remarks;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime initiatedAt;

    private LocalDateTime completedAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
