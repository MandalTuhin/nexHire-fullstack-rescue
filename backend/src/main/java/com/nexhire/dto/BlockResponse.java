package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlockResponse {

    private Long id;
    private String name;
    private Integer capacity;
    private Long cityId;
    private String cityName;
    private String status;
    private Long currentActiveBatchId;
    private String currentActiveBatchCode;
    private boolean available;
}
