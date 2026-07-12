package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin Dashboard summary cards, per P-Claude.md's simplified 6-card list: Active Users,
 * Cities, Blocks, Budget Utilization, Active Projects, Running Batches. Every number is
 * computed live — no hardcoded/mock values.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {

    private long activeUsers;
    private long cities;
    private long blocks;

    /** (reservedBudget + usedBudget) / totalBudget * 100 across all cities — how much of the
     *  total training budget is currently committed (spent or reserved), not just spent. */
    private double budgetUtilizationPercent;

    private long activeProjects;
    private long runningBatches;
}
