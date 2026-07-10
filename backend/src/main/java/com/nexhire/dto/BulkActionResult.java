package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BulkActionResult {

    private int totalRequested;
    private int successCount;
    private int failureCount;
    private List<Failure> failures;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Failure {
        private Long id;
        private String reason;
    }
}
