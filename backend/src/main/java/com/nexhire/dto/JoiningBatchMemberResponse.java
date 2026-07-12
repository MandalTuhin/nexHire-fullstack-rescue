package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
    /** When this member's joining letter response window closes — null until a letter has been
     *  sent. Past this without an accept/reject, JoiningLetterExpiryService marks them
     *  JOINING_EXPIRED. */
    private LocalDateTime responseDeadline;
}
