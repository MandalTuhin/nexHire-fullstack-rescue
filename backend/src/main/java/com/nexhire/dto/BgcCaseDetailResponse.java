package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/** Composite view for the BGC case detail screen — per context.md's "BGC Detail page should
 *  show: candidate details, application details, offer acceptance details, BGC status,
 *  uploaded documents, BGC result history, audit history." */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BgcCaseDetailResponse {

    private Long bgcCaseId;
    private Long applicationId;
    private Long userId;
    private String candidateName;
    private String candidateEmail;
    private String candidatePhone;
    private String jobTitle;
    private String status;
    private String remarks;
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;

    private LocalDateTime offerAcceptedAt;

    private List<BgcDocumentResponse> documents;
    private List<ActivityLogResponse> auditHistory;
}
