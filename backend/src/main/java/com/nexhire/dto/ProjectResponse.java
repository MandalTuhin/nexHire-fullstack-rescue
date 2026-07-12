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
public class ProjectResponse {

    private Long id;
    private String name;
    private String description;
    private String client;
    private String technology;
    private Long locationId;
    private String locationName;
    private Integer totalVacancies;
    private Integer allocatedCount;
    private Integer remainingVacancies;
    private String status;
    private LocalDateTime createdAt;
}
