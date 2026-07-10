package com.nexhire.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignTrainingRequest {

    @NotNull(message = "Training program is required")
    private Long trainingProgramId;
}
