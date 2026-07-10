package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * HR "Pending Actions" queue per context.md's HR DASHBOARD examples — each count is a
 * currently-actionable queue (not a historical/cumulative total).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PendingActionsResponse {

    private long candidatesEligibleForAssessment;
    private long offersPendingSend;
    private long candidatesPendingBgcDocuments;
    private long candidatesEligibleForBatch;
    private long trainingBatchesRequiringResultUpload;
    private long lapCandidatesRequiringReview;
}
