package com.nexhire.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "candidate_location_preferences", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_id", "preference_rank"}),
        @UniqueConstraint(columnNames = {"user_id", "location_name"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateLocationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** 1 = highest priority, 2, 3. */
    @Column(name = "preference_rank", nullable = false)
    private Integer preferenceRank;

    @Column(name = "location_name", nullable = false)
    private String locationName;
}
