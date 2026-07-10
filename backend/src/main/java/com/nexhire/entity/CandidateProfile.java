package com.nexhire.entity;

import com.nexhire.enums.Gender;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidate_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CandidateProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // Personal details
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    private String addressLine;
    private String city;
    private String state;
    private String pincode;

    // Academic details - 10th
    private String tenthSchoolBoard;
    private Double tenthPercentage;
    private Integer tenthPassingYear;

    // Academic details - 12th
    private String twelfthSchoolBoard;
    private Double twelfthPercentage;
    private Integer twelfthPassingYear;

    // Academic details - graduation
    private String graduationDegree;
    private String graduationUniversity;
    private Double graduationCgpa;
    private Integer graduationStartYear;
    private Integer graduationPassingYear;

    // Academic details - post-graduation (optional)
    private String postGraduationDegree;
    private String postGraduationUniversity;
    private Double postGraduationCgpa;
    private Integer postGraduationPassingYear;

    // Skills
    @Column(length = 1000)
    private String primarySkills;

    @Column(length = 1000)
    private String secondarySkills;

    @Column(length = 1000)
    private String certifications;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_file_id")
    private StoredFile resumeFile;

    @Column(nullable = false)
    @Builder.Default
    private Boolean profileCompleted = false;

    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
