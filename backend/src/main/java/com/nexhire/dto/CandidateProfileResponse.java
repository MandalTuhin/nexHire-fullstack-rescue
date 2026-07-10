package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateProfileResponse {

    private Long userId;

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

    private Long resumeFileId;
    private String resumeFileName;

    private List<String> locationPreferences;

    private Boolean profileCompleted;
    private List<String> missingFields;
    private LocalDateTime completedAt;
}
