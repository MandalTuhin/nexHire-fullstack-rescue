package com.nexhire.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlagTraineeRequest {

    @NotBlank(message = "A reason is required when flagging a trainee")
    private String reason;
}
