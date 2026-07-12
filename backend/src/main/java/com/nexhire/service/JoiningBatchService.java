package com.nexhire.service;

import com.nexhire.dto.*;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.FileCategory;
import com.nexhire.enums.JoiningBatchStatus;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * context.md "JOINING BATCH MANAGEMENT" / "JOINING LETTER MANAGEMENT": joining (and later
 * training) is always batch-based. Eligible pool = applications at SELECTED_USER_CREATED
 * (BGC cleared, Employee + SelectedUser already exist per Phase 4) that aren't already in a
 * batch — that status itself is the "not already assigned" guard, since batch assignment
 * moves the application out of SELECTED_USER_CREATED.
 */
@Service
@RequiredArgsConstructor
public class JoiningBatchService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    /** How long a candidate has to accept/reject a joining letter before it auto-expires —
     *  see JoiningLetterExpiryService. */
    private static final int RESPONSE_WINDOW_DAYS = 7;

    private final JoiningBatchRepository joiningBatchRepository;
    private final JoiningBatchMemberRepository joiningBatchMemberRepository;
    private final JoiningLetterRepository joiningLetterRepository;
    private final JobApplicationRepository applicationRepository;
    private final SelectedUserRepository selectedUserRepository;
    private final EmployeeRepository employeeRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final CandidateLocationPreferenceRepository locationPreferenceRepository;
    private final CityRepository locationRepository;
    private final UserRepository userRepository;
    private final StoredFileRepository storedFileRepository;
    private final FileStorageService fileStorageService;
    private final PdfGenerationService pdfGenerationService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final TrainingProgramRepository trainingProgramRepository;
    private final BudgetService budgetService;
    private final BlockService blockService;

    @Transactional(readOnly = true)
    public List<EligibleJoiningCandidateResponse> getEligibleCandidates(Long joiningLocationId) {
        City location = locationRepository.findById(joiningLocationId)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + joiningLocationId));

        List<EligibleJoiningCandidateResponse> result = new ArrayList<>();
        for (JobApplication app : applicationRepository.findByStatus(ApplicationStatus.SELECTED_USER_CREATED)) {
            Employee employee = employeeRepository.findByApplicationId(app.getId()).orElse(null);
            if (employee == null) continue;

            Integer rank = locationPreferenceRepository.findByUserIdOrderByPreferenceRankAsc(app.getUser().getId()).stream()
                    .filter(p -> p.getLocationName().equalsIgnoreCase(location.getName()))
                    .map(CandidateLocationPreference::getPreferenceRank)
                    .findFirst().orElse(null);

            Double score = assessmentResultRepository.findByApplicationId(app.getId())
                    .map(AssessmentResult::getScore).orElse(null);

            result.add(EligibleJoiningCandidateResponse.builder()
                    .applicationId(app.getId())
                    .userId(app.getUser().getId())
                    .employeeCode(employee.getEmployeeCode())
                    .candidateName(app.getUser().getName())
                    .candidateEmail(app.getUser().getEmail())
                    .jobTitle(app.getJob().getTitle())
                    .assessmentScore(score)
                    .locationPreferenceRank(rank)
                    .build());
        }

        // HR wants the pool pre-sorted so filling a batch is just "take the top N": location-
        // preference match first (rank 1 beats rank 2/3 beats no match), then within the same
        // rank tier, higher assessment score first (nulls last), applicationId as a final
        // deterministic tiebreaker.
        result.sort(Comparator
                .comparing((EligibleJoiningCandidateResponse r) -> r.getLocationPreferenceRank() == null ? Integer.MAX_VALUE : r.getLocationPreferenceRank())
                .thenComparing((EligibleJoiningCandidateResponse r) -> r.getAssessmentScore() == null ? Double.NEGATIVE_INFINITY : r.getAssessmentScore(),
                        Comparator.reverseOrder())
                .thenComparing(EligibleJoiningCandidateResponse::getApplicationId));
        return result;
    }

    @Transactional
    public JoiningBatchResponse createBatch(JoiningBatchCreateRequest request, Long actingUserId) {
        if (request.getApplicationIds().size() > request.getBatchSize()) {
            throw new BusinessRuleException("Batch capacity is " + request.getBatchSize()
                    + ". Please select only " + request.getBatchSize() + " candidates or create multiple batches.");
        }
        validateBatchDates(request.getJoiningDate(), request.getTrainingStartDate(), request.getTrainingEndDate());

        City joiningLocation = locationRepository.findById(request.getJoiningLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Joining location not found"));
        City trainingLocation = locationRepository.findById(request.getTrainingLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Training location not found"));
        User createdBy = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        TrainingProgram assignedTraining = null;
        if (request.getTrainingProgramId() != null) {
            assignedTraining = trainingProgramRepository.findById(request.getTrainingProgramId())
                    .orElseThrow(() -> new ResourceNotFoundException("Training program not found with id: " + request.getTrainingProgramId()));
        }

        // trainingProgram (free text) predates the real catalog and the column is still
        // NOT NULL — derive it from the resolved program if the caller only sent an id.
        String trainingProgramText = request.getTrainingProgram();
        if ((trainingProgramText == null || trainingProgramText.isBlank()) && assignedTraining != null) {
            trainingProgramText = assignedTraining.getName();
        }
        if (trainingProgramText == null || trainingProgramText.isBlank()) {
            throw new BusinessRuleException("A training program (or trainingProgramId) is required");
        }

        JoiningBatch batch = JoiningBatch.builder()
                .batchCode("PENDING")
                .batchName(generateBatchName(joiningLocation, request.getJoiningDate()))
                .joiningDate(request.getJoiningDate())
                .joiningLocation(joiningLocation)
                .trainingLocation(trainingLocation)
                .trainingProgram(trainingProgramText)
                .assignedTraining(assignedTraining)
                .block(request.getBlock())
                .trainingStartDate(request.getTrainingStartDate())
                .trainingEndDate(request.getTrainingEndDate())
                .batchSize(request.getBatchSize())
                .createdBy(createdBy)
                .build();
        batch = joiningBatchRepository.save(batch);
        batch.setBatchCode(generateBatchCode(batch.getId(), request.getJoiningDate()));
        batch = joiningBatchRepository.save(batch);

        // P-Claude.md section 4: a Block runs one active batch at a time — book it the moment
        // the wizard assigns it, not just at Training Assignment, so the room is exclusive for
        // this batch's whole occupancy (see class javadoc on JoiningBatch).
        if (request.getTrainingBlockId() != null) {
            Block bookedBlock = blockService.bookBlock(request.getTrainingBlockId(), batch, request.getBatchSize());
            batch.setTrainingBlock(bookedBlock);
            batch = joiningBatchRepository.save(batch);
        }

        addMembers(batch, request.getApplicationIds());

        auditLogService.log(actingUserId, "JOINING_BATCH_CREATED", "JOINING_BATCH", batch.getId(),
                "Created batch " + batch.getBatchCode() + " with " + request.getApplicationIds().size() + " candidate(s)");

        return toResponse(batch, true);
    }

    /** Repeatedly creates full-size batches until every currently-eligible candidate for the
     *  location is covered — context.md: "Auto-create multiple batches if required." */
    @Transactional
    public List<JoiningBatchResponse> autoCreateBatches(JoiningBatchAutoCreateRequest request, Long actingUserId) {
        List<EligibleJoiningCandidateResponse> eligible = getEligibleCandidates(request.getJoiningLocationId());
        List<JoiningBatchResponse> created = new ArrayList<>();

        int index = 0;
        int batchNumber = 1;
        String prefix = request.getBatchNamePrefix() != null && !request.getBatchNamePrefix().isBlank()
                ? request.getBatchNamePrefix() : "Batch";

        while (index < eligible.size()) {
            int end = Math.min(index + request.getBatchSize(), eligible.size());
            List<Long> chunk = eligible.subList(index, end).stream()
                    .map(EligibleJoiningCandidateResponse::getApplicationId).toList();

            created.add(createBatch(JoiningBatchCreateRequest.builder()
                    .batchName(prefix + " " + batchNumber)
                    .joiningDate(request.getJoiningDate())
                    .joiningLocationId(request.getJoiningLocationId())
                    .trainingLocationId(request.getTrainingLocationId())
                    .trainingProgram(request.getTrainingProgram())
                    .block(request.getBlock())
                    .trainingStartDate(request.getTrainingStartDate())
                    .trainingEndDate(request.getTrainingEndDate())
                    .batchSize(request.getBatchSize())
                    .applicationIds(chunk)
                    .build(), actingUserId));

            index = end;
            batchNumber++;
        }
        return created;
    }

    private void addMembers(JoiningBatch batch, List<Long> applicationIds) {
        for (Long appId : applicationIds) {
            JobApplication app = applicationRepository.findById(appId)
                    .orElseThrow(() -> new ResourceNotFoundException("Application not found: " + appId));
            if (app.getStatus() != ApplicationStatus.SELECTED_USER_CREATED) {
                throw new BusinessRuleException("Application #" + appId + " is not eligible for joining batch assignment (status: " + app.getStatus() + ")");
            }
            SelectedUser selectedUser = selectedUserRepository.findByApplicationId(appId)
                    .orElseThrow(() -> new BusinessRuleException("No selected-user record found for application " + appId));
            if (joiningBatchMemberRepository.existsBySelectedUserId(selectedUser.getId())) {
                throw new BusinessRuleException("Candidate for application " + appId + " is already assigned to a joining batch");
            }

            Integer rank = locationPreferenceRepository.findByUserIdOrderByPreferenceRankAsc(app.getUser().getId()).stream()
                    .filter(p -> p.getLocationName().equalsIgnoreCase(batch.getJoiningLocation().getName()))
                    .map(CandidateLocationPreference::getPreferenceRank)
                    .findFirst().orElse(null);

            joiningBatchMemberRepository.save(JoiningBatchMember.builder()
                    .batch(batch)
                    .selectedUser(selectedUser)
                    .application(app)
                    .locationPreferenceRank(rank)
                    .build());

            app.setStatus(ApplicationStatus.JOINING_BATCH_ASSIGNED);
            applicationRepository.save(app);
        }
    }

    @Transactional(readOnly = true)
    public List<JoiningBatchResponse> getAll() {
        return joiningBatchRepository.findAll().stream().map(b -> toResponse(b, false)).toList();
    }

    @Transactional(readOnly = true)
    public JoiningBatchResponse getById(Long id) {
        JoiningBatch batch = joiningBatchRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + id));
        return toResponse(batch, true);
    }

    @Transactional
    public JoiningBatchResponse generateLetters(Long batchId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batchId);

        for (JoiningBatchMember member : members) {
            JobApplication app = member.getApplication();
            if (joiningLetterRepository.findByApplicationId(app.getId()).isPresent()) {
                continue; // idempotent — already generated
            }

            Employee employee = employeeRepository.findByApplicationId(app.getId()).orElse(null);
            byte[] pdfBytes = pdfGenerationService.generate(buildLetterDocument(app, batch, employee));
            Long fileId = fileStorageService.storeGenerated(
                    pdfBytes, "JoiningLetter_" + app.getId() + ".pdf", "application/pdf", FileCategory.JOINING_LETTER, actingUserId);

            joiningLetterRepository.save(JoiningLetter.builder()
                    .application(app)
                    .batch(batch)
                    .content("Joining letter for " + app.getUser().getName() + " — batch " + batch.getBatchCode())
                    .pdfFile(storedFileRepository.getReferenceById(fileId))
                    .joiningDate(batch.getJoiningDate())
                    .location(batch.getJoiningLocation())
                    .build());

            app.setStatus(ApplicationStatus.JOINING_LETTER_GENERATED);
            applicationRepository.save(app);
        }

        auditLogService.log(actingUserId, "JOINING_LETTERS_GENERATED", "JOINING_BATCH", batchId,
                "Generated joining letters for batch " + batch.getBatchCode());

        return toResponse(batch, true);
    }

    /** HR-facing single action: generates (if not already generated), stores, and sends the
     *  joining letter for every batch member who doesn't have one yet, reserves the budget for
     *  just those candidates, updates their status, and moves the batch into
     *  JOINING_ACCEPTANCE_IN_PROGRESS. Replaces the old two-step generate-then-send flow — HR no
     *  longer has to perform those as separate actions (the old generateLetters() endpoint is
     *  left in place, unused by the current frontend, for backward compatibility).
     *
     *  Safely re-callable: members who already have a letter are skipped, which is exactly what
     *  makes the "reject/expire -> remove -> replace -> send again" flow work — a second call
     *  only generates+sends+reserves for the newly-added replacement, not the whole batch again. */
    @Transactional
    public JoiningBatchResponse sendLetters(Long batchId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        User sentBy = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batchId);

        List<JoiningBatchMember> pending = members.stream()
                .filter(m -> joiningLetterRepository.findByApplicationId(m.getApplication().getId()).isEmpty())
                .toList();
        if (pending.isEmpty()) {
            throw new BusinessRuleException("Joining letters have already been sent to every candidate in this batch");
        }

        // P-Claude.md section 5: reserve the projected training cost before letters go out,
        // blocking the send if the training city can't afford it. Only engages once a real
        // TrainingProgram is known for this batch (see JoiningBatchCreateRequest.trainingProgramId) —
        // if not, this is a no-op and behaves exactly as before. Reserves only for the
        // candidates actually being sent a letter in this call (see BudgetService.reserve).
        if (batch.getAssignedTraining() != null) {
            long amount = batch.getAssignedTraining().getCostPerCandidate() * pending.size();
            budgetService.reserve(batch.getTrainingLocation(), amount, batch, actingUserId);
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadline = now.plusDays(RESPONSE_WINDOW_DAYS);
        for (JoiningBatchMember member : pending) {
            JobApplication app = member.getApplication();
            Employee employee = employeeRepository.findByApplicationId(app.getId()).orElse(null);
            byte[] pdfBytes = pdfGenerationService.generate(buildLetterDocument(app, batch, employee));
            Long fileId = fileStorageService.storeGenerated(
                    pdfBytes, "JoiningLetter_" + app.getId() + ".pdf", "application/pdf", FileCategory.JOINING_LETTER, actingUserId);

            joiningLetterRepository.save(JoiningLetter.builder()
                    .application(app)
                    .batch(batch)
                    .content("Joining letter for " + app.getUser().getName() + " — batch " + batch.getBatchCode())
                    .pdfFile(storedFileRepository.getReferenceById(fileId))
                    .joiningDate(batch.getJoiningDate())
                    .location(batch.getJoiningLocation())
                    .sentBy(sentBy)
                    .sentAt(now)
                    .responseDeadline(deadline)
                    .build());

            app.setStatus(ApplicationStatus.JOINING_LETTER_SENT);
            applicationRepository.save(app);

            notificationService.notify(app.getUser().getId(), "JOINING_LETTER", "Joining Letter Issued",
                    "Your joining letter for " + app.getJob().getTitle() + " has been issued. Please review and respond within "
                            + RESPONSE_WINDOW_DAYS + " days.");
        }

        recomputeBatchStatus(batch);

        auditLogService.log(actingUserId, "JOINING_LETTERS_SENT", "JOINING_BATCH", batchId,
                "Sent joining letters for batch " + batch.getBatchCode() + " (" + pending.size() + " candidate(s))");

        return toResponse(batch, true);
    }

    /** Called by JoiningLetterService after each individual accept/reject/expiry response. */
    @Transactional
    public void refreshBatchStatusAfterResponse(Long batchId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId).orElse(null);
        if (batch == null) return;
        recomputeBatchStatus(batch);
    }

    /** Shared by sendLetters() (which may be moving the batch out of CREATED for the first
     *  time) and refreshBatchStatusAfterResponse() (accept/reject/expiry). A member only counts
     *  as "pending" while their letter is still awaiting a response (JOINING_LETTER_SENT) —
     *  once they've accepted, rejected, or expired they no longer block the batch from becoming
     *  READY_FOR_TRAINING (rejected/expired members simply won't be picked up later by
     *  TrainingBatchService.assignTraining's JOINING_ACCEPTED filter). No-op once the batch has
     *  moved past this pre-training stage (training started, cancelled, etc). */
    private void recomputeBatchStatus(JoiningBatch batch) {
        if (batch.getStatus() != JoiningBatchStatus.CREATED
                && batch.getStatus() != JoiningBatchStatus.JOINING_LETTER_SENT
                && batch.getStatus() != JoiningBatchStatus.JOINING_ACCEPTANCE_IN_PROGRESS) {
            return;
        }

        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batch.getId());
        boolean anyPending = members.stream()
                .anyMatch(m -> m.getApplication().getStatus() == ApplicationStatus.JOINING_LETTER_SENT);

        batch.setStatus(anyPending ? JoiningBatchStatus.JOINING_ACCEPTANCE_IN_PROGRESS : JoiningBatchStatus.READY_FOR_TRAINING);
        joiningBatchRepository.save(batch);
    }

    private static final List<JoiningBatchStatus> CANCELLABLE_STATUSES = List.of(
            JoiningBatchStatus.CREATED, JoiningBatchStatus.JOINING_LETTER_SENT,
            JoiningBatchStatus.JOINING_ACCEPTANCE_IN_PROGRESS, JoiningBatchStatus.READY_FOR_TRAINING);

    /** HR: cancels a batch before training starts — releases any booked Block and any budget
     *  reservation back to available, so nothing is left dangling. */
    @Transactional
    public JoiningBatchResponse cancelBatch(Long batchId, String reason, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));

        if (!CANCELLABLE_STATUSES.contains(batch.getStatus())) {
            throw new BusinessRuleException(
                    "Cannot cancel: batch status must be pre-training (current is " + batch.getStatus() + ")");
        }

        if (batch.getTrainingBlock() != null) {
            blockService.releaseBlock(batch.getTrainingBlock().getId());
        }
        budgetService.cancelReservation(batch.getTrainingLocation(), batch, actingUserId);

        batch.setStatus(JoiningBatchStatus.CANCELLED);
        joiningBatchRepository.save(batch);

        auditLogService.log(actingUserId, "JOINING_BATCH_CANCELLED", "JOINING_BATCH", batchId,
                "Batch " + batch.getBatchCode() + " cancelled"
                        + (reason != null && !reason.isBlank() ? " (" + reason + ")" : ""));

        return toResponse(batch, true);
    }

    /** HR: removes a rejected/expired candidate from a batch (before training starts) so a
     *  replacement can take their place. Deliberately scoped to JOINING_REJECTED/JOINING_EXPIRED
     *  only — an accepted or still-pending member must go through cancelBatch (whole batch) or
     *  simply wait, not be silently dropped. Their share of the budget reservation was already
     *  released at reject/expiry time (see JoiningLetterService.rejectJoiningLetter and
     *  JoiningLetterExpiryService), so nothing further to release here — this just frees the
     *  headcount slot. The JoiningLetter row is left in place as a historical record. */
    @Transactional
    public JoiningBatchResponse removeMember(Long batchId, Long applicationId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        if (!CANCELLABLE_STATUSES.contains(batch.getStatus())) {
            throw new BusinessRuleException(
                    "Cannot modify batch membership: batch status must be pre-training (current is " + batch.getStatus() + ")");
        }
        JoiningBatchMember member = joiningBatchMemberRepository.findByBatchIdAndApplicationId(batchId, applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application " + applicationId + " is not a member of batch " + batchId));

        ApplicationStatus status = member.getApplication().getStatus();
        if (status != ApplicationStatus.JOINING_REJECTED && status != ApplicationStatus.JOINING_EXPIRED) {
            throw new BusinessRuleException(
                    "Can only remove a candidate who rejected or let their joining letter expire (current status: " + status + ")");
        }

        joiningBatchMemberRepository.delete(member);

        auditLogService.log(actingUserId, "JOINING_BATCH_MEMBER_REMOVED", "JOINING_BATCH", batchId,
                "Removed " + member.getApplication().getUser().getEmail() + " (" + status + ") from batch " + batch.getBatchCode());

        return toResponse(batch, true);
    }

    /** HR: adds replacement candidate(s) to an existing batch after removing a rejected/expired
     *  member — reuses the same eligibility/validation as initial batch creation (addMembers).
     *  HR then calls sendLetters() again, which — being incremental — only generates, sends, and
     *  reserves budget for these new members, not the whole batch again. */
    @Transactional
    public JoiningBatchResponse addReplacementMembers(Long batchId, List<Long> applicationIds, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        if (!CANCELLABLE_STATUSES.contains(batch.getStatus())) {
            throw new BusinessRuleException(
                    "Cannot modify batch membership: batch status must be pre-training (current is " + batch.getStatus() + ")");
        }
        long currentHeadcount = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batchId).size();
        if (currentHeadcount + applicationIds.size() > batch.getBatchSize()) {
            throw new BusinessRuleException("Batch capacity is " + batch.getBatchSize()
                    + "; adding " + applicationIds.size() + " candidate(s) to the current " + currentHeadcount + " would exceed it");
        }

        addMembers(batch, applicationIds);

        auditLogService.log(actingUserId, "JOINING_BATCH_MEMBER_ADDED", "JOINING_BATCH", batchId,
                "Added " + applicationIds.size() + " replacement candidate(s) to batch " + batch.getBatchCode());

        return toResponse(batch, true);
    }

    /** HR: resends a joining letter to one candidate whose letter expired (or who lost the
     *  original email) without re-sending to the rest of the batch — resets the response
     *  deadline and re-notifies. The candidate's application status must currently be
     *  JOINING_EXPIRED; an accepted/rejected/still-pending member is not eligible for a resend. */
    @Transactional
    public JoiningBatchResponse resendLetter(Long batchId, Long applicationId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        JoiningBatchMember member = joiningBatchMemberRepository.findByBatchIdAndApplicationId(batchId, applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application " + applicationId + " is not a member of batch " + batchId));
        JobApplication app = member.getApplication();

        if (app.getStatus() != ApplicationStatus.JOINING_EXPIRED) {
            throw new BusinessRuleException("Can only resend a letter that has expired (current status: " + app.getStatus() + ")");
        }
        JoiningLetter letter = joiningLetterRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("No joining letter found for application " + applicationId));

        letter.setResponseDeadline(LocalDateTime.now().plusDays(RESPONSE_WINDOW_DAYS));
        joiningLetterRepository.save(letter);

        app.setStatus(ApplicationStatus.JOINING_LETTER_SENT);
        applicationRepository.save(app);

        notificationService.notify(app.getUser().getId(), "JOINING_LETTER", "Joining Letter Reissued",
                "Your joining letter for " + app.getJob().getTitle() + " has been reissued. Please review and respond within "
                        + RESPONSE_WINDOW_DAYS + " days.");

        recomputeBatchStatus(batch);

        auditLogService.log(actingUserId, "JOINING_LETTER_RESENT", "JOINING_BATCH", batchId,
                "Resent joining letter to " + app.getUser().getEmail() + " for batch " + batch.getBatchCode());

        return toResponse(batch, true);
    }

    private String generateBatchCode(Long id, LocalDate joiningDate) {
        return "JB-" + joiningDate.getYear() + "-" + String.format("%05d", id);
    }

    /** HR should never hand-type a batch name (inconsistent, occasionally duplicate) — derive
     *  one deterministically from joining location + joining year/month + a per-location-per-
     *  month sequence number, e.g. "BLR-2026-07-001". Sequence is derived from a count query
     *  rather than a stored counter, so there is a narrow theoretical race if two batches for
     *  the same city/month are created in the same instant (no DB-level uniqueness on this
     *  column) — acceptable for a single-HR-admin-at-a-time internal tool; batchCode (the truly
     *  unique identifier) is unaffected since it derives from the row's own generated id. */
    private String generateBatchName(City joiningLocation, LocalDate joiningDate) {
        String cityCode = cityCode(joiningLocation.getName());
        LocalDate monthStart = joiningDate.withDayOfMonth(1);
        LocalDate monthEnd = joiningDate.withDayOfMonth(joiningDate.lengthOfMonth());
        long countThisMonth = joiningBatchRepository.countByJoiningLocationIdAndJoiningDateBetween(
                joiningLocation.getId(), monthStart, monthEnd);
        int sequence = (int) countThisMonth + 1;
        return String.format("%s-%04d-%02d-%03d", cityCode, joiningDate.getYear(), joiningDate.getMonthValue(), sequence);
    }

    private String cityCode(String cityName) {
        String letters = cityName.replaceAll("[^A-Za-z]", "").toUpperCase();
        return letters.length() >= 3 ? letters.substring(0, 3) : letters;
    }

    /** HR should never be able to pick a past joining date, and the training window must make
     *  chronological sense relative to it. Enforced here (backend) as well as in the frontend
     *  wizard so a direct API call can't bypass it. */
    private void validateBatchDates(LocalDate joiningDate, LocalDate trainingStartDate, LocalDate trainingEndDate) {
        if (joiningDate.isBefore(LocalDate.now())) {
            throw new BusinessRuleException("Joining date cannot be in the past");
        }
        if (trainingStartDate == null) {
            throw new BusinessRuleException("Training start date is required");
        }
        if (trainingEndDate == null) {
            throw new BusinessRuleException("Training end date is required");
        }
        if (!trainingStartDate.isAfter(joiningDate)) {
            throw new BusinessRuleException("Training start date must be after the joining date");
        }
        if (!trainingEndDate.isAfter(trainingStartDate)) {
            throw new BusinessRuleException("Training end date must be after the training start date");
        }
    }

    private PdfGenerationService.PdfDocument buildLetterDocument(JobApplication app, JoiningBatch batch, Employee employee) {
        String candidateName = app.getUser().getName();
        String role = app.getJob().getTitle();
        String today = LocalDate.now().format(DATE_FMT);

        List<String> trainingLines = new ArrayList<>(List.of(
                "Training City: " + batch.getTrainingLocation().getName(),
                "Training Program: " + (batch.getTrainingProgram() != null && !batch.getTrainingProgram().isBlank()
                        ? batch.getTrainingProgram() : "To be confirmed")
        ));
        if (batch.getTrainingStartDate() != null) {
            trainingLines.add("Training Start Date: " + batch.getTrainingStartDate().format(DATE_FMT));
        }
        if (batch.getTrainingEndDate() != null) {
            trainingLines.add("Training End Date: " + batch.getTrainingEndDate().format(DATE_FMT));
        }

        return new PdfGenerationService.PdfDocument(
                "Joining Letter",
                List.of(
                        new PdfGenerationService.PdfSection(null, List.of(
                                "Date: " + today,
                                "",
                                "Dear " + candidateName + ","
                        )),
                        new PdfGenerationService.PdfSection("Joining Details", List.of(
                                "Employee ID: " + (employee != null ? employee.getEmployeeCode() : "To be assigned"),
                                "Role: " + role,
                                "Joining Date: " + batch.getJoiningDate().format(DATE_FMT),
                                "Joining City: " + batch.getJoiningLocation().getName(),
                                "Batch: " + batch.getBatchCode() + " (" + batch.getBatchName() + ")"
                        )),
                        new PdfGenerationService.PdfSection("Training Details", trainingLines),
                        new PdfGenerationService.PdfSection("Reporting Instructions", List.of(
                                "Please report to the joining location mentioned above on your joining date with a valid " +
                                        "photo ID. Further instructions will be shared by your HR coordinator closer to the date."
                        )),
                        new PdfGenerationService.PdfSection(null, List.of(
                                "We look forward to welcoming you to the team.",
                                "",
                                "Sincerely,",
                                "NexHire Human Resources"
                        ))
                )
        );
    }

    private JoiningBatchResponse toResponse(JoiningBatch batch, boolean includeMembers) {
        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batch.getId());
        return JoiningBatchResponse.builder()
                .id(batch.getId())
                .batchCode(batch.getBatchCode())
                .batchName(batch.getBatchName())
                .joiningDate(batch.getJoiningDate())
                .joiningLocationId(batch.getJoiningLocation().getId())
                .joiningLocationName(batch.getJoiningLocation().getName())
                .trainingLocationId(batch.getTrainingLocation().getId())
                .trainingLocationName(batch.getTrainingLocation().getName())
                .trainingProgram(batch.getTrainingProgram())
                .block(batch.getBlock())
                .trainingBlockId(batch.getTrainingBlock() != null ? batch.getTrainingBlock().getId() : null)
                .trainingBlockName(batch.getTrainingBlock() != null ? batch.getTrainingBlock().getName() : null)
                .trainingStartDate(batch.getTrainingStartDate())
                .trainingEndDate(batch.getTrainingEndDate())
                .batchSize(batch.getBatchSize())
                .currentHeadcount(members.size())
                .status(batch.getStatus().name())
                .createdByName(batch.getCreatedBy().getName())
                .createdAt(batch.getCreatedAt())
                .members(includeMembers ? members.stream().map(this::toMemberResponse).toList() : null)
                .build();
    }

    private JoiningBatchMemberResponse toMemberResponse(JoiningBatchMember member) {
        JobApplication app = member.getApplication();
        Employee employee = employeeRepository.findByApplicationId(app.getId()).orElse(null);
        var letter = joiningLetterRepository.findByApplicationId(app.getId()).orElse(null);
        String letterStatus = letter == null ? "NOT_GENERATED" : (letter.getSentAt() != null ? "SENT" : "GENERATED");

        return JoiningBatchMemberResponse.builder()
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .locationPreferenceRank(member.getLocationPreferenceRank())
                .applicationStatus(app.getStatus().name())
                .joiningLetterStatus(letterStatus)
                .responseDeadline(letter != null ? letter.getResponseDeadline() : null)
                .build();
    }
}
