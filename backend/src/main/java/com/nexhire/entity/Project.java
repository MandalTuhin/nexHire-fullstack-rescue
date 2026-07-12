package com.nexhire.entity;

import com.nexhire.enums.ProjectStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String client;

    private String technology;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id")
    private City location;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalVacancies = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.ACTIVE;

    /** Column stays named team_size (pre-dates this rename) to avoid a data migration —
     *  the Java-side name now matches what it actually represents. */
    @Column(name = "team_size", nullable = false)
    @Builder.Default
    private Integer allocatedCount = 0;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** Recomputes ACTIVE/FILLED after allocatedCount or totalVacancies changes. Never touches
     *  an INACTIVE status — that's an explicit Admin action, not a derived one. */
    public void recomputeStatus() {
        if (status == ProjectStatus.INACTIVE) return;
        status = (totalVacancies != null && totalVacancies > 0 && allocatedCount >= totalVacancies)
                ? ProjectStatus.FILLED
                : ProjectStatus.ACTIVE;
    }
}
