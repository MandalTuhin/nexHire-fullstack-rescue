package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Minimal location shape for candidate-facing dropdowns — no budget/seat figures. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationNameResponse {

    private Long id;
    private String name;
    private String city;
}
