package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** The offer PDF is auto-generated already; this optional note is only used in the
 *  candidate notification, not written into the offer letter document itself. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OfferRequest {

    private String note;
}
