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
public class BgcDocumentResponse {

    private Long id;
    private Long bgcCaseId;
    private Long applicationId;
    private String documentType;
    private String fileName;
    private String status;
    private String remarks;
    private LocalDateTime uploadedAt;
    private LocalDateTime reviewedAt;
}
