package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CityRequest {

    private String name;

    /** ACTIVE / INACTIVE. Optional on update. Budget totals aren't set here — use
     *  BudgetService's allocate/manualAdjustment (via CityController) so every change is
     *  captured in the passbook ledger. */
    private String status;
}
