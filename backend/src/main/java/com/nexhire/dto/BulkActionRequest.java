package com.nexhire.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkActionRequest {

    @NotEmpty(message = "At least one application id is required")
    private List<Long> applicationIds;

    private String reason;
}
