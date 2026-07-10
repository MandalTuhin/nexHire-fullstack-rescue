package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibleJoiningCandidateResponse {

    private Long applicationId;
    private Long userId;
    private String employeeCode;
    private String candidateName;
    private String candidateEmail;
    private String jobTitle;
    private Double assessmentScore;
    /** 1/2/3 if one of the candidate's 3 location preferences matches the requested joining
     *  location, else null — candidates are returned pre-sorted by this (nulls last). */
    private Integer locationPreferenceRank;
}
