package com.nexhire.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String actionType;

    @Column(nullable = false)
    private String description;

    /** Optional entity classification (e.g. "APPLICATION", "BGC_CASE") to support filtering/audit tabs. */
    private String entityType;

    private Long entityId;

    @Column(nullable = false)
    private LocalDateTime timestamp;
}
