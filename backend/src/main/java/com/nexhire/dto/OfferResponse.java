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
public class OfferResponse {

    private Long id;
    private Long applicationId;
    private Long userId;
    private String candidateName;
    private String candidateEmail;
    private String jobTitle;
    private Double assessmentScore;
    private String content;
    private Long pdfFileId;
    private String status;
    private LocalDateTime generatedAt;
    private String sentByName;
    private LocalDateTime sentAt;
    private LocalDateTime respondedAt;
}
