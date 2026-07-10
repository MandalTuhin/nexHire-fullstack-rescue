package com.nexhire.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Auto-fills as many full batches as needed to cover all currently-eligible candidates
 *  for the given joining location — context.md: "Auto-create multiple batches if required." */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoiningBatchAutoCreateRequest {

    private String batchNamePrefix;

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
}
