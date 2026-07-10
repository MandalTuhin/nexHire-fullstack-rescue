package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/** Deliberately no @NotBlank/@NotNull here — the profile stepper saves incrementally,
 *  one section at a time. Completeness is computed server-side once all sections are present. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfileRequest {

    private LocalDate dateOfBirth;
    private String gender;
    private String addressLine;
    private String city;
    private String state;
    private String pincode;

    private String tenthSchoolBoard;
    private Double tenthPercentage;
    private Integer tenthPassingYear;

    private String twelfthSchoolBoard;
    private Double twelfthPercentage;
    private Integer twelfthPassingYear;

    private String graduationDegree;
    private String graduationUniversity;
    private Double graduationCgpa;
    private Integer graduationStartYear;
    private Integer graduationPassingYear;

    private String postGraduationDegree;
    private String postGraduationUniversity;
    private Double postGraduationCgpa;
    private Integer postGraduationPassingYear;

    private String primarySkills;
    private String secondarySkills;
    private String certifications;

    /** Exactly 3 unique, non-blank entries when present; index 0 = preference 1 (highest priority). */
    private List<String> locationPreferences;
}
