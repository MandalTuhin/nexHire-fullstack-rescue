package com.nexhire.service;

import com.nexhire.dto.*;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.JoiningBatchStatus;
import com.nexhire.enums.TraineeFinalResult;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * context.md "TRAINING ASSIGNMENT" / "TRAINING BATCH DASHBOARD" / "LAP FLOW" / "TRAINING
 * COMPLETION AND RELEASE LOGIC". Operates on the same JoiningBatch entity Phase 5 created —
 * "joining batch" and "training batch" are the same underlying batch at different lifecycle
 * stages, not separate entities (context.md's own field lists for both are near-identical).
 *
 * Capacity/budget enforcement lives elsewhere by design: Block capacity is validated once, at
 * booking time (JoiningBatchService.createBatch -> BlockService.bookBlock), and budget
 * sufficiency is validated by BudgetService (reserve at joining-letter-send time,
 * chargeTrainingCost here). "Logged-in HR employeeId as hrId" is adapted to just the acting
 * User's id — HR users aren't modeled as Employee rows in this build (Employee is created only
 * via the BGC-clear pipeline), so a literal employeeId lookup isn't meaningful.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrainingBatchService {

    private final JoiningBatchRepository joiningBatchRepository;
    private final JoiningBatchMemberRepository joiningBatchMemberRepository;
    private final JoiningBatchService joiningBatchService;
    private final TrainingProgramRepository trainingProgramRepository;
    private final TraineeRepository traineeRepository;
    private final ReleaseRecordRepository releaseRecordRepository;
    private final LapHistoryRepository lapHistoryRepository;
    private final EmployeeRepository employeeRepository;
    private final SelectedUserRepository selectedUserRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final BudgetService budgetService;
    private final BlockService blockService;

    // ─── Candidate self-service ───────────────────────────────────────────────────

    /** EMPLOYEE: the logged-in candidate's own trainee record (real Trainee/JoiningBatch
     *  pipeline — replaces the older, disconnected TrainingRecord-based "My Training" page). */
    public TraineeDetailResponse getMyTrainee(Long userId) {
        Trainee trainee = traineeRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No trainee record found for current user"));
        return toTraineeDetail(trainee);
    }

    // ─── Training Program catalog ────────────────────────────────────────────────

    public List<TrainingProgramResponse> getPrograms() {
        return trainingProgramRepository.findAll().stream().map(this::toProgramResponse).toList();
    }

    @Transactional
    public TrainingProgramResponse createProgram(TrainingProgramCreateRequest request) {
        TrainingProgram program = trainingProgramRepository.save(TrainingProgram.builder()
                .name(request.getName())
                .duration(request.getDuration())
                .costPerCandidate(request.getCostPerCandidate())
                .cutoffScore(request.getCutoffScore())
                .minimumAttendancePercentage(request.getMinimumAttendancePercentage())
                .build());
        return toProgramResponse(program);
    }

    @Transactional
    public TrainingProgramResponse updateProgram(Long id, TrainingProgramUpdateRequest request) {
        TrainingProgram program = trainingProgramRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Training program not found with id: " + id));

        if (request.getName() != null) program.setName(request.getName());
        if (request.getDuration() != null) program.setDuration(request.getDuration());
        if (request.getCostPerCandidate() != null) program.setCostPerCandidate(request.getCostPerCandidate());
        if (request.getCutoffScore() != null) program.setCutoffScore(request.getCutoffScore());
        if (request.getMinimumAttendancePercentage() != null) program.setMinimumAttendancePercentage(request.getMinimumAttendancePercentage());
        if (request.getStatus() != null) {
            try {
                program.setStatus(com.nexhire.enums.TrainingProgramStatus.valueOf(request.getStatus().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BusinessRuleException("Invalid training program status: " + request.getStatus());
            }
        }

        return toProgramResponse(trainingProgramRepository.save(program));
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
        City location = batch.getTrainingLocation();

        // Capacity is already enforced: the batch's trainingBlock was booked at creation time
        // with capacity >= batchSize (see BlockService.bookBlock), and actualHeadcount here can
        // only be <= batchSize (a subset of accepted members) — no separate seat check needed.
        // Budget sufficiency is enforced by chargeTrainingCost itself (it throws if there's no
        // reservation and the city can't cover actualCost; if a reservation exists, its
        // sufficiency was already validated when it was made — see BudgetService.reserve).
        long requiredAmount = program.getCostPerCandidate() * actualHeadcount;
        budgetService.chargeTrainingCost(location, batch, requiredAmount, actingUserId);

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
        // Map each batch defensively: a single un-mappable row (e.g. a legacy record left in an
        // unexpected state by an earlier schema/enum change) must not turn this whole fetch-all
        // endpoint into a 500 — that would hide every valid batch behind one bad one. A failed
        // row is logged in full (batch id + stack trace) so the exact offending record and cause
        // are diagnosable from the server log, then skipped, and the rest of the list is returned.
        return joiningBatchRepository.findAll().stream()
                .map(batch -> {
                    try {
                        return toDashboardResponse(batch);
                    } catch (RuntimeException ex) {
                        log.error("Failed to map joining batch id={} for /api/training-batches dashboard; "
                                + "skipping this row so the rest of the list still loads", batch.getId(), ex);
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
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
        doMoveToLap(trainee, remarks, actingUserId);
        return toTraineeDetail(trainee);
    }

    /** HR: bulk move-to-LAP — batches can run into the hundreds, so processing them one at a
     *  time in the UI isn't realistic. Per-item try/catch, no rollback-on-partial-failure —
     *  matches the established bulkAssign/bulkSend/bulkTransition idiom elsewhere in the
     *  codebase (e.g. ProjectService.bulkAssign, OfferService.bulkSend). */
    @Transactional
    public BulkActionResult bulkMoveToLap(List<Long> traineeIds, String remarks, Long actingUserId) {
        int success = 0;
        List<BulkActionResult.Failure> failures = new ArrayList<>();
        for (Long traineeId : traineeIds) {
            try {
                Trainee trainee = traineeRepository.findById(traineeId)
                        .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));
                doMoveToLap(trainee, remarks, actingUserId);
                success++;
            } catch (Exception e) {
                failures.add(BulkActionResult.Failure.builder().id(traineeId).reason(e.getMessage()).build());
            }
        }
        return BulkActionResult.builder()
                .totalRequested(traineeIds.size())
                .successCount(success)
                .failureCount(failures.size())
                .failures(failures)
                .build();
    }

    /** Package-visible (not private) so TraineeExcelService can move a trainee to LAP the
     *  instant HR uploads a FAILED result, instead of waiting for completeBatch(). */
    void doMoveToLap(Trainee trainee, String remarks, Long actingUserId) {
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
        logLapHistory(trainee, "MOVED_TO_LAP", remarks, actingUserId);

        notificationService.notify(application.getUser().getId(), "LAP",
                "Learning Assistance Program",
                "You've been enrolled in the Learning Assistance Program (LAP) to help you meet the training requirements.");
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
        logLapHistory(trainee, "REMOVED_FROM_LAP", null, actingUserId);

        return toTraineeDetail(trainee);
    }

    /** HR: "Release Candidate" — an explicit override release usable on any not-yet-released
     *  trainee, most importantly one who cleared LAP (isReleaseEligible() permanently excludes
     *  lapEnabled/LAP-result trainees from the automatic completeBatch() release path, so
     *  without this action there was previously no way to release someone after LAP at all —
     *  see class-level context). Clears lapEnabled if still set, since HR releasing them is by
     *  definition the resolution of that LAP episode. */
    @Transactional
    public TraineeDetailResponse releaseTrainee(Long traineeId, Long actingUserId) {
        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));
        if (trainee.getReleased()) {
            throw new BusinessRuleException("Trainee " + trainee.getUser().getEmail() + " is already released");
        }
        if (!hasPassingResult(trainee)) {
            throw new BusinessRuleException("Upload a passing LAP reassessment result before releasing this trainee");
        }
        User actingUser = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        doRelease(trainee, actingUser);
        return toTraineeDetail(trainee);
    }

    /** HR: bulk release — e.g. releasing the 18 of 20 LAP trainees who cleared it together,
     *  rather than one at a time. Same per-item try/catch idiom as bulkMoveToLap. */
    @Transactional
    public BulkActionResult bulkRelease(List<Long> traineeIds, Long actingUserId) {
        User actingUser = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        int success = 0;
        List<BulkActionResult.Failure> failures = new ArrayList<>();
        for (Long traineeId : traineeIds) {
            try {
                Trainee trainee = traineeRepository.findById(traineeId)
                        .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));
                if (trainee.getReleased()) {
                    throw new BusinessRuleException("Already released");
                }
                if (!hasPassingResult(trainee)) {
                    throw new BusinessRuleException("A passing assessment result is required before release");
                }
                doRelease(trainee, actingUser);
                success++;
            } catch (Exception e) {
                failures.add(BulkActionResult.Failure.builder().id(traineeId).reason(e.getMessage()).build());
            }
        }
        return BulkActionResult.builder()
                .totalRequested(traineeIds.size())
                .successCount(success)
                .failureCount(failures.size())
                .failures(failures)
                .build();
    }

    private void doRelease(Trainee trainee, User releasedBy) {
        ReleaseRecord record = releaseRecordRepository.findByTraineeId(trainee.getId())
                .orElseGet(() -> ReleaseRecord.builder().trainee(trainee).build());
        record.setReleasedBy(releasedBy);
        record.setReleasedAt(LocalDateTime.now());
        releaseRecordRepository.save(record);

        trainee.setReleased(true);
        trainee.setLapEnabled(false);
        traineeRepository.save(trainee);

        JobApplication application = trainee.getApplication();
        application.setStatus(ApplicationStatus.RELEASED);
        applicationRepository.save(application);

        notificationService.notify(application.getUser().getId(), "RELEASED",
                "Training Completed — Released",
                "Congratulations! You've completed training and are now eligible for project allocation.");

        auditLogService.log(releasedBy.getId(), "TRAINEE_RELEASED", "APPLICATION", application.getId(),
                "Trainee " + trainee.getUser().getEmail() + " released");

        checkBatchFullyResolved(trainee.getBatch(), releasedBy.getId());
    }

    /** HR: "Flag Candidate" — a trainee who failed even after a LAP attempt is permanently
     *  marked unsuccessful and excluded from project allocation (RMG only queries
     *  ApplicationStatus.RELEASED). Distinct from FAILED/LAP, which are still recoverable —
     *  this is the terminal outcome for someone who isn't. */
    @Transactional
    public TraineeDetailResponse flagTrainee(Long traineeId, String reason, Long actingUserId) {
        String normalizedReason = requireFlagReason(reason);
        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));
        if (trainee.getReleased()) {
            throw new BusinessRuleException("Cannot flag " + trainee.getUser().getEmail() + " — already released");
        }
        doFlag(trainee, normalizedReason, actingUserId);
        return toTraineeDetail(trainee);
    }

    /** HR: bulk flag — e.g. flagging the 2 of 20 LAP trainees who failed again together. */
    @Transactional
    public BulkActionResult bulkFlag(List<Long> traineeIds, String reason, Long actingUserId) {
        String normalizedReason = requireFlagReason(reason);
        int success = 0;
        List<BulkActionResult.Failure> failures = new ArrayList<>();
        for (Long traineeId : traineeIds) {
            try {
                Trainee trainee = traineeRepository.findById(traineeId)
                        .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));
                if (trainee.getReleased()) {
                    throw new BusinessRuleException("Already released");
                }
                doFlag(trainee, normalizedReason, actingUserId);
                success++;
            } catch (Exception e) {
                failures.add(BulkActionResult.Failure.builder().id(traineeId).reason(e.getMessage()).build());
            }
        }
        return BulkActionResult.builder()
                .totalRequested(traineeIds.size())
                .successCount(success)
                .failureCount(failures.size())
                .failures(failures)
                .build();
    }

    private void doFlag(Trainee trainee, String reason, Long actingUserId) {
        trainee.setFinalResult(TraineeFinalResult.FAILED);
        trainee.setLapEnabled(false);
        trainee.setReleased(false);
        trainee.setFlagReason(reason);
        traineeRepository.save(trainee);

        JobApplication application = trainee.getApplication();
        application.setStatus(ApplicationStatus.TRAINING_FAILED);
        applicationRepository.save(application);

        auditLogService.log(actingUserId, "TRAINEE_FLAGGED", "APPLICATION", application.getId(),
                "Trainee " + trainee.getUser().getEmail() + " flagged as unsuccessful"
                        + (reason != null && !reason.isBlank() ? " (" + reason + ")" : ""));
        logLapHistory(trainee, "FLAGGED", reason, actingUserId);

        checkBatchFullyResolved(trainee.getBatch(), actingUserId);
    }

    private boolean hasPassingResult(Trainee trainee) {
        return trainee.getFinalResult() == TraineeFinalResult.PASSED
                || trainee.getFinalResult() == TraineeFinalResult.COMPLETED;
    }

    private String requireFlagReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new BusinessRuleException("A reason is required when flagging a trainee");
        }
        return reason.trim();
    }

    /** Once a batch is RELEASE_PENDING_LAP (training done, Block already released, but at least
     *  one trainee unresolved), each individual release/flag can be the one that finally clears
     *  the last straggler — check after every such action and auto-complete the batch the moment
     *  none remain, rather than requiring a separate HR "recheck" action. */
    private void checkBatchFullyResolved(JoiningBatch batch, Long actingUserId) {
        if (batch == null || (batch.getStatus() != JoiningBatchStatus.RELEASE_PENDING_LAP
                && batch.getStatus() != JoiningBatchStatus.COMPLETED_WITH_EXCEPTIONS)) return;

        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batch.getId()))
                .toList();
        boolean allResolved = trainees.stream().allMatch(this::isResolved);
        if (!allResolved) return;

        batch.setStatus(JoiningBatchStatus.COMPLETED);
        joiningBatchRepository.save(batch);

        auditLogService.log(actingUserId, "JOINING_BATCH_COMPLETED", "JOINING_BATCH", batch.getId(),
                "Batch " + batch.getBatchCode() + " fully resolved — every trainee reached a final outcome");
    }

    private boolean isResolved(Trainee trainee) {
        return Boolean.TRUE.equals(trainee.getReleased())
                || (trainee.getFlagReason() != null && !trainee.getFlagReason().isBlank());
    }

    // ─── Completion / Release ───────────────────────────────────────────────────

    /** HR: "Complete Batch" — releases every "Yet To Release" trainee (a PASSED/COMPLETED result
     *  HR already validated at upload time — see TraineeExcelService.commit, which now moves a
     *  FAILED result straight to LAP instead of waiting for this step), frees the training Block
     *  immediately regardless of LAP, and marks the batch COMPLETED if every trainee is resolved
     *  or RELEASE_PENDING_LAP if any (LAP, or still without an uploaded result) aren't yet —
     *  that status then auto-clears to COMPLETED as each straggler is resolved later (see
     *  checkBatchFullyResolved), without HR needing to re-run this action. */
    @Transactional
    public TrainingBatchDetailResponse completeBatch(Long batchId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        if (batch.getStatus() != JoiningBatchStatus.TRAINING_IN_PROGRESS) {
            throw new InvalidStateTransitionException(
                    "Cannot complete batch: status must be TRAINING_IN_PROGRESS, current is " + batch.getStatus());
        }

        User actingUser = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batchId))
                .toList();

        if (trainees.isEmpty()) {
            throw new BusinessRuleException("Cannot complete this batch because it has no trainees");
        }
        long missingResults = trainees.stream()
                .filter(t -> !Boolean.TRUE.equals(t.getReleased()))
                .filter(t -> t.getFlagReason() == null || t.getFlagReason().isBlank())
                .filter(t -> t.getFinalResult() == null || t.getFinalResult() == TraineeFinalResult.PENDING)
                .count();
        if (missingResults > 0) {
            throw new BusinessRuleException("Upload assessment results for all trainees before completing the batch ("
                    + missingResults + " result" + (missingResults == 1 ? " is" : "s are") + " still missing)");
        }

        int releasedCount = 0;
        int flaggedCount = 0;
        int lapCount = 0;
        for (Trainee trainee : trainees) {
            if (Boolean.TRUE.equals(trainee.getReleased())) {
                releasedCount++;
                continue;
            }
            if (trainee.getFlagReason() != null && !trainee.getFlagReason().isBlank()) {
                flaggedCount++;
                continue;
            }
            if (isReleaseEligible(trainee)) {
                doRelease(trainee, actingUser);
                releasedCount++;
            } else if (trainee.getFinalResult() == TraineeFinalResult.FAILED && !Boolean.TRUE.equals(trainee.getLapEnabled())) {
                // Safety net — normally already moved to LAP at upload time (TraineeExcelService).
                doMoveToLap(trainee, "Auto-moved to LAP after batch completion (uploaded result: FAILED)", actingUserId);
                lapCount++;
            }
        }

        int resolvedCount = releasedCount + flaggedCount;
        batch.setStatus(resolvedCount == trainees.size() && !trainees.isEmpty()
                ? JoiningBatchStatus.COMPLETED : JoiningBatchStatus.RELEASE_PENDING_LAP);
        joiningBatchRepository.save(batch);

        // The room is free again the moment training itself is done — LAP resolution never
        // occupies it, per P-Claude.md's "physical training room should already be available
        // for reuse" while the batch itself can still be RELEASE_PENDING_LAP.
        if (batch.getTrainingBlock() != null) {
            blockService.releaseBlock(batch.getTrainingBlock().getId());
        }

        auditLogService.log(actingUserId, "BATCH_COMPLETED", "JOINING_BATCH", batchId,
                "Batch " + batch.getBatchCode() + " completed: " + releasedCount + "/" + trainees.size()
                        + " released, " + flaggedCount + " already flagged, " + lapCount + " auto-moved to LAP");

        return getDetail(batchId);
    }

    /** HR: archives a finished batch. Purely a terminal marker — no further state changes.
     *  Deliberately COMPLETED-only: a batch with unresolved LAP trainees (RELEASE_PENDING_LAP)
     *  can't be archived until checkBatchFullyResolved clears it to COMPLETED. */
    @Transactional
    public TrainingBatchDetailResponse closeBatch(Long batchId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));

        if (batch.getStatus() != JoiningBatchStatus.COMPLETED) {
            throw new BusinessRuleException(
                    "Cannot close: batch status must be COMPLETED (current is " + batch.getStatus() + ")");
        }

        batch.setStatus(JoiningBatchStatus.CLOSED);
        joiningBatchRepository.save(batch);

        auditLogService.log(actingUserId, "JOINING_BATCH_CLOSED", "JOINING_BATCH", batchId,
                "Batch " + batch.getBatchCode() + " closed");

        return getDetail(batchId);
    }

    /** HR already validated PASSED/COMPLETED vs FAILED when uploading the result Excel (see
     *  TraineeExcelService.commit, which immediately moves a FAILED row to LAP) — completeBatch
     *  trusts that decision directly rather than re-deriving it from a cutoff/attendance check,
     *  so a HR-marked-PASSED trainee is never silently stuck unreleased. */
    private boolean isReleaseEligible(Trainee trainee) {
        if (trainee.getReleased()) return false;
        if (Boolean.TRUE.equals(trainee.getLapEnabled())) return false;
        return trainee.getFinalResult() == TraineeFinalResult.PASSED || trainee.getFinalResult() == TraineeFinalResult.COMPLETED;
    }

    private void logLapHistory(Trainee trainee, String action, String remarks, Long actingUserId) {
        User actingUser = actingUserId != null ? userRepository.findById(actingUserId).orElse(null) : null;
        lapHistoryRepository.save(LapHistory.builder()
                .trainee(trainee)
                .action(action)
                .remarks(remarks)
                .actingUser(actingUser)
                .build());
    }

    // ─── Mapping ──────────────────────────────────────────────────────────────

    private LapHistoryResponse toLapHistoryResponse(LapHistory h) {
        return LapHistoryResponse.builder()
                .id(h.getId())
                .action(h.getAction())
                .remarks(h.getRemarks())
                .actingUserName(h.getActingUser() != null ? h.getActingUser().getName() : null)
                .createdAt(h.getCreatedAt())
                .build();
    }

    private TrainingProgramResponse toProgramResponse(TrainingProgram p) {
        return TrainingProgramResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .duration(p.getDuration())
                .costPerCandidate(p.getCostPerCandidate())
                .cutoffScore(p.getCutoffScore())
                .minimumAttendancePercentage(p.getMinimumAttendancePercentage())
                .status(p.getStatus().name())
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
                .jobTitle(app.getJob().getTitle())
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
                .lapHistory(lapHistoryRepository.findByTraineeIdOrderByCreatedAtDesc(trainee.getId()).stream()
                        .map(this::toLapHistoryResponse).toList())
                .build();
    }

    private TrainingBatchDashboardResponse toDashboardResponse(JoiningBatch batch) {
        List<Trainee> trainees = traineeRepository.findAll().stream()
                .filter(t -> t.getBatch() != null && t.getBatch().getId().equals(batch.getId()))
                .toList();

        int passed = 0, failed = 0, lap = 0, released = 0, pending = 0;
        for (Trainee t : trainees) {
            if (Boolean.TRUE.equals(t.getReleased())) released++;
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
                .joiningLocationName(batch.getJoiningLocation() != null ? batch.getJoiningLocation().getName() : null)
                .trainingLocationName(batch.getTrainingLocation() != null ? batch.getTrainingLocation().getName() : null)
                .trainingProgram(batch.getTrainingProgram())
                .block(batch.getBlock())
                .trainingBlockName(batch.getTrainingBlock() != null ? batch.getTrainingBlock().getName() : null)
                .batchSize(batch.getBatchSize())
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
