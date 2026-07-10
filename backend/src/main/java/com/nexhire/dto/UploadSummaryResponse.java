package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/** Returned by both the /validate (preview, uploadLogId=null) and /commit steps of an Excel bulk upload. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UploadSummaryResponse {

    private Long uploadLogId;
    private String uploadType;
    private String fileName;
    private LocalDateTime uploadedAt;
    private int totalRows;
    private int successRows;
    private int failedRows;
    private String status;
    private List<RowErrorResponse> errors;
    private List<java.util.LinkedHashMap<String, String>> previewRows;
}
