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
public class BgcVendorRequestResponse {

    private Long id;
    private Long bgcCaseId;
    private String vendorName;
    private String vendorLink;
    private String requestReference;
    private String sentByName;
    private LocalDateTime sentAt;
    private String status;
    private String remarks;
}
