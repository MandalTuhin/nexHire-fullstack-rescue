package com.nexhire.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRequest {

    @NotBlank(message = "Project name is required")
    private String name;

    private String description;
    private String client;
    private String technology;
    private Long locationId;
    private Integer totalVacancies;

    /** ACTIVE / FILLED / INACTIVE. Optional on update; ignored on create (new projects default
     *  to ACTIVE). FILLED is normally derived automatically — only set this to force INACTIVE. */
    private String status;
}
