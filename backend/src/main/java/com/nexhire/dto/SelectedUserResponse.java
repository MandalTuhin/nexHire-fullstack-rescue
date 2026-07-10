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
public class SelectedUserResponse {

    private Long selectedUserId;
    private Long applicationId;
    private Long userId;
    private String employeeCode;
    private String candidateName;
    private String candidateEmail;
    private String jobTitle;
    private String status;
    private LocalDateTime createdAt;
}
