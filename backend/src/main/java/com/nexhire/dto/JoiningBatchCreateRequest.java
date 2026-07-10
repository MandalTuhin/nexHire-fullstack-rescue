package com.nexhire.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoiningBatchCreateRequest {

    private String batchName;

    @NotNull(message = "Joining date is required")
    private LocalDate joiningDate;

    @NotNull(message = "Joining location is required")
    private Long joiningLocationId;

    @NotNull(message = "Training location is required")
    private Long trainingLocationId;

    private String trainingProgram;

    private String block;

    private LocalDate trainingStartDate;

    private LocalDate trainingEndDate;

    @NotNull(message = "Batch size is required")
    private Integer batchSize;

    @NotEmpty(message = "Select at least one candidate")
    private List<Long> applicationIds;
}
