package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TraineeDetailResponse {

    private Long traineeId;
    private Long applicationId;
    private Long userId;
    private String employeeCode;
    private Long selectedUserId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String jobTitle;
    private Long batchId;
    private String batchCode;
    private Double assessmentScore;
    private Double score;
    private Double attendancePercentage;
    private String finalResult;
    private Boolean lapEnabled;
    private Boolean released;
    private String flagReason;
    private String remarks;
    private String applicationStatus;
    private LocalDateTime joinedAt;
    private List<LapHistoryResponse> lapHistory;
}
