package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingProgramResponse {

    private Long id;
    private String name;
    private Long costPerCandidate;
    private Double cutoffScore;
    private Double minimumAttendancePercentage;
}
