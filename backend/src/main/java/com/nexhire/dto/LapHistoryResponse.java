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
public class LapHistoryResponse {

    private Long id;
    private String action;
    private String remarks;
    private String actingUserName;
    private LocalDateTime createdAt;
}
