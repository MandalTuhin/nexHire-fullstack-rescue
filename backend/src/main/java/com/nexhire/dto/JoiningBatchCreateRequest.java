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

    /** Optional real TrainingProgram-catalog FK. When supplied, the batch's projected training
     *  cost is known at creation time, which lets sendLetters() reserve budget up front (see
     *  BudgetService). Left null, the older free-text-only flow still works unchanged — budget
     *  reservation simply doesn't engage until Training Assignment time. */
    private Long trainingProgramId;

    private String block;

    /** Optional real Block-catalog FK. When supplied, the block is booked exclusively for this
     *  batch immediately (see BlockService.bookBlock) — the wizard should only ever offer
     *  currently-available blocks (GET /api/blocks?cityId=&availableOnly=true) so this rarely
     *  conflicts, but a genuine race is still rejected with a clear error. Left null, the older
     *  free-text block field still works unchanged. */
    private Long trainingBlockId;

    private LocalDate trainingStartDate;

    private LocalDate trainingEndDate;

    @NotNull(message = "Batch size is required")
    private Integer batchSize;

    @NotEmpty(message = "Select at least one candidate")
    private List<Long> applicationIds;
}
