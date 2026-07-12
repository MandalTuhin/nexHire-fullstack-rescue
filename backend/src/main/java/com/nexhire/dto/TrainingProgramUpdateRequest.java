package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** All fields optional — only supplied ones are updated. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingProgramUpdateRequest {

    private String name;
    private String duration;
    private Long costPerCandidate;
    private Double cutoffScore;
    private Double minimumAttendancePercentage;
    /** ACTIVE / INACTIVE */
    private String status;
}
