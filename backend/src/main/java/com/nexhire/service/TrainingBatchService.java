package com.nexhire.service;

import com.nexhire.dto.*;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.JoiningBatchStatus;
import com.nexhire.enums.TraineeFinalResult;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.InsufficientResourceException;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * context.md "TRAINING ASSIGNMENT" / "TRAINING BATCH DASHBOARD" / "LAP FLOW" / "TRAINING
 * COMPLETION AND RELEASE LOGIC". Operates on the same JoiningBatch entity Phase 5 created —
 * "joining batch" and "training batch" are the same underlying batch at different lifecycle
 * stages, not separate entities (context.md's own field lists for both are near-identical).
 *
 * Block-level seat enforcement from the spec is adapted to location-level (HiringBudget/
 * TrainingSeat are per-Location; there's no separate Block catalog in this build — see
 * JoiningBatch's own class comment). "Logged-in HR employeeId as hrId" is adapted to just the
 * acting User's id — HR users aren't modeled as Employee rows in this build (Employee is
 * created only via the BGC-clear pipeline), so a literal employeeId lookup isn't meaningful.
 */
@Service
@RequiredArgsConstructor
public class TrainingBatchService {

    private final JoiningBatchRepository joiningBatchRepository;
    private final JoiningBatchMemberRepository joiningBatchMemberRepository;
    private final JoiningBatchService joiningBatchService;
    private final TrainingProgramRepository trainingProgramRepository;
    private final TraineeRepository traineeRepository;
    private final ReleaseRecordRepository releaseRecordRepository;
    private final EmployeeRepository employeeRepository;
    private final SelectedUserRepository selectedUserRepository;
    private final HiringBudgetRepository hiringBudgetRepository;
    private final TrainingSeatRepository trainingSeatRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    // ─── Training Program catalog ────────────────────────────────────────────────

    public List<TrainingProgramResponse> getPrograms() {
        return trainingProgramRepository.findAll().stream().map(this::toProgramResponse).toList();
    }

    @Transactional
    public TrainingProgramResponse createProgram(TrainingProgramCreateRequest request) {
        TrainingProgram program = trainingProgramRepository.save(TrainingProgram.builder()
                .name(request.getName())
                .costPerCandidate(request.getCostPerCandidate())
                .cutoffScore(request.getCutoffScore())
                .minimumAttendancePercentage(request.getMinimumAttendancePercentage())
                .build());
        return toProgramResponse(program);
    }

    // ─── Training Assignment (budget/seat deduction + Trainee creation) ──────────

    @Transactional
    public TrainingBatchDetailResponse assignTraining(Long batchId, AssignTrainingRequest request, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));

        if (batch.getStatus() != JoiningBatchStatus.READY_FOR_TRAINING) {
            throw new InvalidStateTransitionException(
                    "Cannot assign training: batch status must be READY_FOR_TRAINING, current is " + batch.getStatus());
        }

        TrainingProgram program = trainingProgramRepository.findById(request.getTrainingProgramId())
                .orElseThrow(() -> new ResourceNotFoundException("Training program not found"));

        User hr = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batchId);
        List<JoiningBatchMember> accepted = members.stream()
                .filter(m -> m.getApplication().getStatus() == ApplicationStatus.JOINING_ACCEPTED)
                .toList();

        if (accepted.isEmpty()) {
            throw new BusinessRuleException("No candidates in this batch have accepted their joining letter yet");
        }

        for (JoiningBatchMember member : accepted) {
            if (!employeeRepository.existsByApplicationId(member.getApplication().getId())) {
                throw new BusinessRuleException("Application " + member.getApplication().getId() + " has no employee record");
            }
            if (!selectedUserRepository.existsByApplicationId(member.getApplication().getId())) {
                throw new BusinessRuleException("Application " + member.getApplication().getId() + " has no selected-user record");
            }
            if (traineeRepository.findByApplicationId(member.getApplication().getId()).isPresent()) {
                throw new BusinessRuleException("Application " + member.getApplication().getId() + " is already a trainee in another batch");
            }
        }

        int actualHeadcount = accepted.size();
        Location location = batch.getTrainingLocation();

        HiringBudget budget = hiringBudgetRepository.findByLocationId(location.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Hiring budget not found for location: " + location.getName()));
        TrainingSeat seats = trainingSeatRepository.findByLocationId(location.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Training seats not found for location: " + location.getName()));

        long requiredAmount = program.getCostPerCandidate() * actualHeadcount;
        int availableSlots = budget.getTotalSlots() - budget.getUsedSlots();
        long availableAmount = budget.getBudgetAmount() - budget.getUsedAmount();
        int availableSeats = seats.getTotalSeats() - seats.getOccupiedSeats();

        if (availableSlots < actualHeadcount || availableAmount < requiredAmount || availableSeats < actualHeadcount) {
            throw new InsufficientResourceException(
                    "Insufficient resources at " + location.getName() + " for " + actualHeadcount + " candidate(s): "
                            + "slots available " + availableSlots + ", budget available Rs." + availableAmount
                            + " (need Rs." + requiredAmount + "), seats available " + availableSeats);
        }

        // Transactional, atomic deduction — no partial updates on failure (exception above
        // already prevented reaching this point if any check failed).
        budget.setUsedSlots(budget.getUsedSlots() + actualHeadcount);
        budget.setUsedAmount(budget.getUsedAmount() + requiredAmount);
        hiringBudgetRepository.save(budget);

        seats.setOccupiedSeats(seats.getOccupiedSeats() + actualHeadcount);
        trainingSeatRepository.save(seats);

        for (JoiningBatchMember member : accepted) {
            JobApplication application = member.getApplication();

            Trainee trainee = traineeRepository.save(Trainee.builder()
                    .user(application.getUser())
                    .application(application)
                    .batch(batch)
                    .joinedAt(LocalDateTime.now())
                    .build());

            application.setStatus(ApplicationStatus.TRAINING_ASSIGNED);
            applicationRepository.save(application);
            application.setStatus(ApplicationStatus.TRAINING_IN_PROGRESS);
            applicationRepository.save(application);

            notificationService.notify(application.getUser().getId(), "TRAINING_ASSIGNED",
                    "Training Assigned",
                    "You have been assigned to training batch " + batch.getBatchCode() + " at " + location.getName() + ".");
        }

        batch.setAssignedTraining(program);
        batch.setStatus(JoiningBatchStatus.TRAINING_IN_PROGRESS);
        joiningBatchRepository.save(batch);

        auditLogService.log(actingUserId, "TRAINING_ASSIGNED", "JOINING_BATCH", batch.getId(),
                "Assigned batch " + batch.getBatchCode() + " to training program '" + program.getName()
                        + "' — " + actualHeadcount + " trainee(s), Rs." + requiredAmount + " deducted (hrId=" + hr.getId() + ")");

        return getDetail(batchId);
    }

    // ─── Dashboard / Detail ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TrainingBatchDashboardResponse> getDashboard() {
        return joiningBatchRepository.findAll().stream().map(this::toDashboardResponse).toList();
    }

    @Transactional(readOnly = true)
    public TrainingBatchDetailResponse getDetail(Long batchId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batchId))
                .toList();

        return TrainingBatchDetailResponse.builder()
                .batch(joiningBatchService.getById(batchId))
                .assignedTrainingName(batch.getAssignedTraining() != null ? batch.getAssignedTraining().getName() : null)
                .assignedTrainingCutoffScore(batch.getAssignedTraining() != null ? batch.getAssignedTraining().getCutoffScore() : null)
                .assignedTrainingMinAttendance(batch.getAssignedTraining() != null ? batch.getAssignedTraining().getMinimumAttendancePercentage() : null)
                .trainees(trainees.stream().map(this::toTraineeDetail).toList())
                .build();
    }

    // ─── LAP ────────────────────────────────────────────────────────────────────

    @Transactional
    public TraineeDetailResponse moveToLap(Long traineeId, String remarks, Long actingUserId) {
        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));

        trainee.setLapEnabled(true);
        trainee.setFinalResult(TraineeFinalResult.LAP);
        trainee.setReleased(false);
        if (remarks != null && !remarks.isBlank()) {
            trainee.setRemarks(remarks);
        }
        traineeRepository.save(trainee);

        JobApplication application = trainee.getApplication();
        application.setStatus(ApplicationStatus.LAP);
        applicationRepository.save(application);

        auditLogService.log(actingUserId, "MOVED_TO_LAP", "APPLICATION", application.getId(),
                "Trainee " + trainee.getUser().getEmail() + " moved to LAP");

        notificationService.notify(application.getUser().getId(), "LAP",
                "Learning Assistance Program",
                "You've been enrolled in the Learning Assistance Program (LAP) to help you meet the training requirements.");

        return toTraineeDetail(trainee);
    }

    @Transactional
    public TraineeDetailResponse removeFromLap(Long traineeId, Long actingUserId) {
        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));

        trainee.setLapEnabled(false);
        trainee.setFinalResult(TraineeFinalResult.PENDING);
        traineeRepository.save(trainee);

        JobApplication application = trainee.getApplication();
        application.setStatus(ApplicationStatus.TRAINING_IN_PROGRESS);
        applicationRepository.save(application);

        auditLogService.log(actingUserId, "REMOVED_FROM_LAP", "APPLICATION", application.getId(),
                "Trainee " + trainee.getUser().getEmail() + " removed from LAP");

        return toTraineeDetail(trainee);
    }

    // ─── Completion / Release ───────────────────────────────────────────────────

    @Transactional
    public TrainingBatchDetailResponse completeBatch(Long batchId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));

        User releasedBy = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batchId))
                .toList();

        int releasedCount = 0;
        for (Trainee trainee : trainees) {
            if (trainee.getReleased()) {
                releasedCount++;
                continue;
            }
            if (isReleaseEligible(trainee, batch.getAssignedTraining())) {
                ReleaseRecord record = releaseRecordRepository.findByTraineeId(trainee.getId())
                        .orElseGet(() -> ReleaseRecord.builder().trainee(trainee).build());
                record.setReleasedBy(releasedBy);
                record.setReleasedAt(LocalDateTime.now());
                releaseRecordRepository.save(record);
                trainee.setReleased(true);
                traineeRepository.save(trainee);

                JobApplication application = trainee.getApplication();
                application.setStatus(ApplicationStatus.RELEASED);
                applicationRepository.save(application);

                notificationService.notify(application.getUser().getId(), "RELEASED",
                        "Training Completed — Released",
                        "Congratulations! You've completed training and are now eligible for project allocation.");

                releasedCount++;
            }
        }

        batch.setStatus(releasedCount == trainees.size() && !trainees.isEmpty()
                ? JoiningBatchStatus.COMPLETED : JoiningBatchStatus.COMPLETED_WITH_EXCEPTIONS);
        joiningBatchRepository.save(batch);

        auditLogService.log(actingUserId, "BATCH_COMPLETED", "JOINING_BATCH", batchId,
                "Batch " + batch.getBatchCode() + " completed: " + releasedCount + "/" + trainees.size() + " released");

        return getDetail(batchId);
    }

    private boolean isReleaseEligible(Trainee trainee, TrainingProgram program) {
        if (trainee.getReleased()) return false;
        if (Boolean.TRUE.equals(trainee.getLapEnabled())) return false;
        if (trainee.getFinalResult() == TraineeFinalResult.FAILED || trainee.getFinalResult() == TraineeFinalResult.LAP) return false;
        if (trainee.getFinalResult() != TraineeFinalResult.PASSED && trainee.getFinalResult() != TraineeFinalResult.COMPLETED) return false;
        if (trainee.getScore() == null || program == null || trainee.getScore() < program.getCutoffScore()) return false;
        if (trainee.getAttendancePercentage() == null || trainee.getAttendancePercentage() < program.getMinimumAttendancePercentage()) return false;
        return true;
    }

    // ─── Mapping ──────────────────────────────────────────────────────────────

    private TrainingProgramResponse toProgramResponse(TrainingProgram p) {
        return TrainingProgramResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .costPerCandidate(p.getCostPerCandidate())
                .cutoffScore(p.getCutoffScore())
                .minimumAttendancePercentage(p.getMinimumAttendancePercentage())
                .build();
    }

    private TraineeDetailResponse toTraineeDetail(Trainee trainee) {
        JobApplication app = trainee.getApplication();
        Employee employee = employeeRepository.findByApplicationId(app.getId()).orElse(null);
        Long selectedUserId = selectedUserRepository.findByApplicationId(app.getId()).map(SelectedUser::getId).orElse(null);

        return TraineeDetailResponse.builder()
                .traineeId(trainee.getId())
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .selectedUserId(selectedUserId)
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .candidatePhone(app.getUser().getPhone())
                .batchId(trainee.getBatch() != null ? trainee.getBatch().getId() : null)
                .batchCode(trainee.getBatch() != null ? trainee.getBatch().getBatchCode() : null)
                .score(trainee.getScore())
                .attendancePercentage(trainee.getAttendancePercentage())
                .finalResult(trainee.getFinalResult().name())
                .lapEnabled(trainee.getLapEnabled())
                .released(trainee.getReleased())
                .flagReason(trainee.getFlagReason())
                .remarks(trainee.getRemarks())
                .applicationStatus(app.getStatus().name())
                .joinedAt(trainee.getJoinedAt())
                .build();
    }

    private TrainingBatchDashboardResponse toDashboardResponse(JoiningBatch batch) {
        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batch.getId()))
                .toList();

        int passed = 0, failed = 0, lap = 0, released = 0, pending = 0;
        for (Trainee t : trainees) {
            if (t.getReleased()) released++;
            else if (Boolean.TRUE.equals(t.getLapEnabled())) lap++;
            else if (t.getFinalResult() == TraineeFinalResult.FAILED) failed++;
            else if (t.getFinalResult() == TraineeFinalResult.PASSED || t.getFinalResult() == TraineeFinalResult.COMPLETED) passed++;
            else pending++;
        }

        return TrainingBatchDashboardResponse.builder()
                .id(batch.getId())
                .batchCode(batch.getBatchCode())
                .batchName(batch.getBatchName())
                .joiningDate(batch.getJoiningDate())
                .joiningLocationName(batch.getJoiningLocation().getName())
                .trainingLocationName(batch.getTrainingLocation().getName())
                .trainingProgram(batch.getTrainingProgram())
                .block(batch.getBlock())
                .trainer(batch.getTrainer())
                .trainingStartDate(batch.getTrainingStartDate())
                .trainingEndDate(batch.getTrainingEndDate())
                .status(batch.getStatus().name())
                .totalCandidates(trainees.size())
                .passedCount(passed)
                .failedCount(failed)
                .lapCount(lap)
                .releasedCount(released)
                .pendingCount(pending)
                .progressPercent(computeProgress(batch.getTrainingStartDate(), batch.getTrainingEndDate()))
                .build();
    }

    private int computeProgress(LocalDate start, LocalDate end) {
        if (start == null || end == null) return 0;
        LocalDate today = LocalDate.now();
        if (today.isBefore(start)) return 0;
        if (!today.isBefore(end)) return 100;
        long totalDays = java.time.temporal.ChronoUnit.DAYS.between(start, end);
        if (totalDays <= 0) return 100;
        long elapsed = java.time.temporal.ChronoUnit.DAYS.between(start, today);
        return (int) Math.min(100, Math.max(0, (elapsed * 100) / totalDays));
    }
}
