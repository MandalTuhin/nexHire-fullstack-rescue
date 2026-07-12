package com.nexhire.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/** Shared body shape for bulk trainee actions (move-to-LAP, flag) that need one free-text
 *  note alongside the id list — `note` is remarks for bulk-LAP, the flag reason for bulk-flag. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkTraineeActionRequest {

    @NotEmpty(message = "At least one trainee id is required")
    private List<Long> traineeIds;

    private String note;
}
