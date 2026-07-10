package com.nexhire.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingProgramCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Cost per candidate is required")
    private Long costPerCandidate;

    @NotNull(message = "Cutoff score is required")
    private Double cutoffScore;

    @NotNull(message = "Minimum attendance percentage is required")
    private Double minimumAttendancePercentage;
}
