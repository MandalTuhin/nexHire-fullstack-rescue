package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoiningBatchResponse {

    private Long id;
    private String batchCode;
    private String batchName;
    private LocalDate joiningDate;
    private Long joiningLocationId;
    private String joiningLocationName;
    private Long trainingLocationId;
    private String trainingLocationName;
    private String trainingProgram;
    private String block;
    private Long trainingBlockId;
    private String trainingBlockName;
    private LocalDate trainingStartDate;
    private LocalDate trainingEndDate;
    private Integer batchSize;
    private Integer currentHeadcount;
    private String status;
    private String createdByName;
    private LocalDateTime createdAt;

    /** Present only on the detail endpoint. */
    private List<JoiningBatchMemberResponse> members;
}
