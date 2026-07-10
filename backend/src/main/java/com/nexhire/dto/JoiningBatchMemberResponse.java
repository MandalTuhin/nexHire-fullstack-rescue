package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JoiningBatchMemberResponse {

    private Long applicationId;
    private Long userId;
    private String employeeCode;
    private String candidateName;
    private String candidateEmail;
    private Integer locationPreferenceRank;
    private String applicationStatus;
    private String joiningLetterStatus;
}
