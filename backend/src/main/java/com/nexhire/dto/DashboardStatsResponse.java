package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * HR Dashboard summary cards, per context.md's "HR DASHBOARD" card list. Every number is
 * computed live from persisted data (no mocking). Counts are deliberately sourced from the
 * most durable signal for each stage rather than JobApplication.status alone: several statuses
 * (ASSESSMENT_PASSED, OFFER_ACCEPTED, BGC_CLEARED, EMPLOYEE_CREATED, TRAINING_ASSIGNED) are
 * auto-advanced to the next stage within the same transaction that sets them, so a
 * countByStatus() against them would almost always read ~0. Where that's the case, the count
 * instead comes from the dedicated record for that stage (OfferLetter, BackgroundVerification,
 * Employee/SelectedUser, JoiningBatch.assignedTraining) which persists independently of how far
 * the application has since moved.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {

    private long totalApplications;
    private long profileCompletedCandidates;

    private long assessmentAssignedCount;
    private long assessmentScoreUploadedCount;
    private long assessmentPassedCount;
    private long assessmentFailedCount;

    private long offerLettersGenerated;
    private long offerLettersSent;
    private long offerAcceptedCount;
    private long offerRejectedCount;

    private long bgcInitiatedCount;
    private long bgcDocumentsSubmittedCount;
    private long bgcClearedCount;
    private long bgcFailedCount;

    private long employeesCreated;
    private long selectedUsersCreated;

    private long joiningBatchesCreated;
    private long joiningLettersSent;
    private long joiningAcceptedCount;

    private long trainingBatchesAssigned;
    private long lapCandidates;
    private long passedTrainees;
    private long failedTrainees;
    private long releasedCandidates;

    private long projectAllocatedCandidates;

    private long totalVacancyUsed;
    private long totalVacancyAvailable;
    private long totalBudgetUsed;
    private long totalBudgetAvailable;
}
