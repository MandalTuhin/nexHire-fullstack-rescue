package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BgcVendorRequestCreate {

    private String vendorName;
    private String vendorLink;
    private String requestReference;
    private String remarks;
}
