package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingBatchDashboardResponse {

    private Long id;
    private String batchCode;
    private String batchName;
    private LocalDate joiningDate;
    private String joiningLocationName;
    private String trainingLocationName;
    private String trainingProgram;
    private String block;
    private String trainer;
    private LocalDate trainingStartDate;
    private LocalDate trainingEndDate;
    private String status;

    private Integer totalCandidates;
    private Integer passedCount;
    private Integer failedCount;
    private Integer lapCount;
    private Integer releasedCount;
    private Integer pendingCount;

    /** 0 before start date, proportional between start/end, 100 after end date. */
    private Integer progressPercent;
}
