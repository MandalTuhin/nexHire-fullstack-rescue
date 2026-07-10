package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingBatchDetailResponse {

    private JoiningBatchResponse batch;
    private String assignedTrainingName;
    private Double assignedTrainingCutoffScore;
    private Double assignedTrainingMinAttendance;
    private List<TraineeDetailResponse> trainees;
}
