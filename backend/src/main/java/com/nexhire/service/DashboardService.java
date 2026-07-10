package com.nexhire.service;

import com.nexhire.dto.ChartDataResponse;
import com.nexhire.dto.DashboardStatsResponse;
import com.nexhire.dto.PendingActionsResponse;
import com.nexhire.entity.HiringBudget;
import com.nexhire.entity.TrainingSeat;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.BgvStatus;
import com.nexhire.enums.JoiningBatchStatus;
import com.nexhire.enums.TraineeFinalResult;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Computes HR Dashboard metrics live from the persisted domain data — nothing here is mocked.
 *
 * A number of pipeline statuses (ASSESSMENT_PASSED, OFFER_ACCEPTED, BGC_CLEARED,
 * EMPLOYEE_CREATED, TRAINING_ASSIGNED) are auto-advanced to the next status within the very
 * same transaction that sets them (see AssessmentService.qualify, OfferService.acceptOffer,
 * BgvService.applyStatus, EmployeeSelectionService.createIfAbsent, TrainingBatchService
 * .assignTraining) — so a plain countByStatus() against any of those reads ~0 in practice.
 * For those stages, counts are sourced from the dedicated record instead (OfferLetter,
 * BackgroundVerification, Employee/SelectedUser, JoiningBatch.assignedTraining), which persists
 * independently of how far the application has since moved — giving a true cumulative count
 * rather than a snapshot of a bucket that's essentially never populated.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private static final List<BgvStatus> BGC_DOCS_NOT_YET_SUBMITTED =
            List.of(BgvStatus.INITIATED, BgvStatus.DOCUMENTS_PENDING);

    private static final List<ApplicationStatus> JOINING_ACCEPTED_OR_LATER = List.of(
            ApplicationStatus.JOINING_ACCEPTED, ApplicationStatus.TRAINING_ASSIGNED,
            ApplicationStatus.TRAINING_IN_PROGRESS, ApplicationStatus.TRAINING_RESULT_UPLOADED,
            ApplicationStatus.LAP, ApplicationStatus.COMPLETED_WITH_EXCEPTIONS,
            ApplicationStatus.RELEASED, ApplicationStatus.PROJECT_ASSIGNED, ApplicationStatus.ONBOARDED);

    private final JobApplicationRepository applicationRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final OfferLetterRepository offerLetterRepository;
    private final BackgroundVerificationRepository bgvRepository;
    private final EmployeeRepository employeeRepository;
    private final SelectedUserRepository selectedUserRepository;
    private final JoiningBatchRepository joiningBatchRepository;
    private final JoiningLetterRepository joiningLetterRepository;
    private final TraineeRepository traineeRepository;
    private final HiringBudgetRepository hiringBudgetRepository;
    private final TrainingSeatRepository trainingSeatRepository;

    public DashboardStatsResponse getStats() {
        List<HiringBudget> budgets = hiringBudgetRepository.findAll();
        long budgetUsed = budgets.stream().mapToLong(HiringBudget::getUsedAmount).sum();
        long budgetTotal = budgets.stream().mapToLong(HiringBudget::getBudgetAmount).sum();

        List<TrainingSeat> seats = trainingSeatRepository.findAll();
        long seatsUsed = seats.stream().mapToLong(TrainingSeat::getOccupiedSeats).sum();
        long seatsTotal = seats.stream().mapToLong(TrainingSeat::getTotalSeats).sum();

        return DashboardStatsResponse.builder()
                .totalApplications(applicationRepository.count())
                .profileCompletedCandidates(candidateProfileRepository.countByProfileCompletedTrue())

                .assessmentAssignedCount(applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_ASSIGNED))
                .assessmentScoreUploadedCount(applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_SCORE_UPLOADED))
                .assessmentPassedCount(offerLetterRepository.count())
                .assessmentFailedCount(applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_FAILED))

                .offerLettersGenerated(offerLetterRepository.count())
                .offerLettersSent(offerLetterRepository.countBySentAtIsNotNull())
                .offerAcceptedCount(bgvRepository.count())
                .offerRejectedCount(applicationRepository.countByStatus(ApplicationStatus.OFFER_REJECTED))

                .bgcInitiatedCount(bgvRepository.count())
                .bgcDocumentsSubmittedCount(bgvRepository.countByStatusNotIn(BGC_DOCS_NOT_YET_SUBMITTED))
                .bgcClearedCount(bgvRepository.countByStatus(BgvStatus.CLEARED))
                .bgcFailedCount(bgvRepository.countByStatus(BgvStatus.FAILED))

                .employeesCreated(employeeRepository.count())
                .selectedUsersCreated(selectedUserRepository.count())

                .joiningBatchesCreated(joiningBatchRepository.count())
                .joiningLettersSent(joiningLetterRepository.countBySentAtIsNotNull())
                .joiningAcceptedCount(applicationRepository.countByStatusIn(JOINING_ACCEPTED_OR_LATER))

                .trainingBatchesAssigned(joiningBatchRepository.countByAssignedTrainingIsNotNull())
                .lapCandidates(traineeRepository.countByLapEnabledTrue())
                .passedTrainees(traineeRepository.countByFinalResultIn(List.of(TraineeFinalResult.PASSED, TraineeFinalResult.COMPLETED)))
                .failedTrainees(traineeRepository.countByFinalResultIn(List.of(TraineeFinalResult.FAILED)))
                .releasedCandidates(traineeRepository.countByReleasedTrue())

                .projectAllocatedCandidates(applicationRepository.countByStatus(ApplicationStatus.PROJECT_ASSIGNED))

                .totalVacancyUsed(seatsUsed)
                .totalVacancyAvailable(Math.max(0, seatsTotal - seatsUsed))
                .totalBudgetUsed(budgetUsed)
                .totalBudgetAvailable(Math.max(0, budgetTotal - budgetUsed))
                .build();
    }

    /** HR "pending actions" queue — currently-actionable counts, not historical totals. */
    public PendingActionsResponse getPendingActions() {
        return PendingActionsResponse.builder()
                .candidatesEligibleForAssessment(applicationRepository.countByStatus(ApplicationStatus.APPLIED))
                .offersPendingSend(applicationRepository.countByStatus(ApplicationStatus.OFFER_GENERATED))
                .candidatesPendingBgcDocuments(bgvRepository.countByStatus(BgvStatus.DOCUMENTS_PENDING))
                .candidatesEligibleForBatch(applicationRepository.countByStatus(ApplicationStatus.SELECTED_USER_CREATED))
                .trainingBatchesRequiringResultUpload(joiningBatchRepository.countByStatus(JoiningBatchStatus.TRAINING_IN_PROGRESS))
                .lapCandidatesRequiringReview(traineeRepository.countByLapEnabledTrue())
                .build();
    }

    public ChartDataResponse getApplicationChart() {
        return chart("Applications",
                List.of("Applied", "In Assessment", "Passed", "Failed", "Offered"),
                List.of(
                        applicationRepository.countByStatus(ApplicationStatus.APPLIED),
                        applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_ASSIGNED)
                                + applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_SCORE_UPLOADED),
                        offerLetterRepository.count(),
                        applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_FAILED),
                        offerLetterRepository.countBySentAtIsNotNull()),
                List.of("#3b82f6", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6"));
    }

    public ChartDataResponse getAssessmentChart() {
        return chart("Assessments",
                List.of("Assigned", "Score Uploaded", "Passed", "Failed"),
                List.of(
                        applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_ASSIGNED),
                        applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_SCORE_UPLOADED),
                        offerLetterRepository.count(),
                        applicationRepository.countByStatus(ApplicationStatus.ASSESSMENT_FAILED)),
                List.of("#3b82f6", "#f59e0b", "#22c55e", "#ef4444"));
    }

    public ChartDataResponse getBgvChart() {
        return chart("BGV",
                List.of("Pending", "In Progress", "Cleared", "Failed", "Recheck/On Hold"),
                List.of(
                        bgvRepository.countByStatus(BgvStatus.DOCUMENTS_PENDING) + bgvRepository.countByStatus(BgvStatus.INITIATED),
                        bgvRepository.countByStatus(BgvStatus.DOCUMENTS_SUBMITTED) + bgvRepository.countByStatus(BgvStatus.VERIFICATION_IN_PROGRESS),
                        bgvRepository.countByStatus(BgvStatus.CLEARED),
                        bgvRepository.countByStatus(BgvStatus.FAILED),
                        bgvRepository.countByStatus(BgvStatus.RECHECK_REQUIRED) + bgvRepository.countByStatus(BgvStatus.ON_HOLD)),
                List.of("#f59e0b", "#3b82f6", "#22c55e", "#ef4444", "#f97316"));
    }

    public ChartDataResponse getTrainingChart() {
        return chart("Training",
                List.of("In Progress", "LAP", "Released", "Project Assigned"),
                List.of(
                        applicationRepository.countByStatus(ApplicationStatus.TRAINING_IN_PROGRESS),
                        traineeRepository.countByLapEnabledTrue(),
                        traineeRepository.countByReleasedTrue(),
                        applicationRepository.countByStatus(ApplicationStatus.PROJECT_ASSIGNED)),
                List.of("#f59e0b", "#f97316", "#22c55e", "#3b82f6"));
    }

    private ChartDataResponse chart(String label, List<String> labels, List<Long> data, List<String> colors) {
        return ChartDataResponse.builder()
                .labels(labels)
                .datasets(List.of(ChartDataResponse.Dataset.builder()
                        .label(label)
                        .data(data)
                        .backgroundColor(colors)
                        .build()))
                .build();
    }
}
