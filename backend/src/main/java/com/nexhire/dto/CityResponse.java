package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CityResponse {

    private Long id;
    private String name;
    private Long totalBudget;
    private Long reservedBudget;
    private Long usedBudget;
    private Long availableBudget;
    private String status;
    private int blockCount;
}
