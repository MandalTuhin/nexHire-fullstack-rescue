package com.nexhire.entity;

import com.nexhire.enums.SelectedStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Created immediately alongside Employee once BGC clears — must always carry an employeeId. */
@Entity
@Table(name = "selected_users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SelectedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private JobApplication application;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SelectedStatus status = SelectedStatus.SELECTED;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
