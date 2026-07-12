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
public class BudgetTransactionResponse {

    private Long id;
    private Long cityId;
    private String type;
    private Long amount;
    private Long relatedBatchId;
    private String relatedBatchCode;
    private String createdByName;
    private String note;
    private LocalDateTime createdAt;
}
