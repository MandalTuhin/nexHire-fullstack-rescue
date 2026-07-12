package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RmgDashboardResponse {

    private long releasedCandidatesWaiting;
    private long activeProjects;
    private long remainingVacancies;
    private List<RecentAllocation> recentAllocations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentAllocation {
        private Long id;
        private String candidateName;
        private String projectName;
        private String assignedAt;
    }
}
