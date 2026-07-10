package com.nexhire.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Links a JoiningBatch to a candidate (via their SelectedUser/employee record). */
@Entity
@Table(name = "joining_batch_members")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JoiningBatchMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    private JoiningBatch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_user_id", nullable = false, unique = true)
    private SelectedUser selectedUser;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private JobApplication application;

    /** 1/2/3 if a location preference matched the batch's joining location, else null. */
    private Integer locationPreferenceRank;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
