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

    private final JoiningBatchRepository joiningBatchRepository;
    private final JoiningBatchMemberRepository joiningBatchMemberRepository;
    private final JoiningLetterRepository joiningLetterRepository;
    private final JobApplicationRepository applicationRepository;
    private final SelectedUserRepository selectedUserRepository;
    private final EmployeeRepository employeeRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final CandidateLocationPreferenceRepository locationPreferenceRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final StoredFileRepository storedFileRepository;
    private final FileStorageService fileStorageService;
    private final PdfGenerationService pdfGenerationService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<EligibleJoiningCandidateResponse> getEligibleCandidates(Long joiningLocationId) {
        Location location = locationRepository.findById(joiningLocationId)
                .orElseThrow(() -> new ResourceNotFoundException("Location not found with id: " + joiningLocationId));

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

        result.sort(Comparator
                .comparing((EligibleJoiningCandidateResponse r) -> r.getLocationPreferenceRank() == null ? Integer.MAX_VALUE : r.getLocationPreferenceRank())
                .thenComparing(EligibleJoiningCandidateResponse::getApplicationId));
        return result;
    }

    @Transactional
    public JoiningBatchResponse createBatch(JoiningBatchCreateRequest request, Long actingUserId) {
        if (request.getApplicationIds().size() > request.getBatchSize()) {
            throw new BusinessRuleException("Batch capacity is " + request.getBatchSize()
                    + ". Please select only " + request.getBatchSize() + " candidates or create multiple batches.");
        }

        Location joiningLocation = locationRepository.findById(request.getJoiningLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Joining location not found"));
        Location trainingLocation = locationRepository.findById(request.getTrainingLocationId())
                .orElseThrow(() -> new ResourceNotFoundException("Training location not found"));
        User createdBy = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        JoiningBatch batch = JoiningBatch.builder()
                .batchCode("PENDING")
                .batchName(request.getBatchName() != null && !request.getBatchName().isBlank()
                        ? request.getBatchName() : "Batch " + request.getJoiningDate())
                .joiningDate(request.getJoiningDate())
                .joiningLocation(joiningLocation)
                .trainingLocation(trainingLocation)
                .trainingProgram(request.getTrainingProgram())
                .block(request.getBlock())
                .trainingStartDate(request.getTrainingStartDate())
                .trainingEndDate(request.getTrainingEndDate())
                .batchSize(request.getBatchSize())
                .createdBy(createdBy)
                .build();
        batch = joiningBatchRepository.save(batch);
        batch.setBatchCode(generateBatchCode(batch.getId(), request.getJoiningDate()));
        batch = joiningBatchRepository.save(batch);

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

    @Transactional
    public JoiningBatchResponse sendLetters(Long batchId, Long actingUserId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining batch not found with id: " + batchId));
        User sentBy = userRepository.findById(actingUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batchId);

        for (JoiningBatchMember member : members) {
            JobApplication app = member.getApplication();
            JoiningLetter letter = joiningLetterRepository.findByApplicationId(app.getId())
                    .orElseThrow(() -> new BusinessRuleException("Letters must be generated before sending (application " + app.getId() + ")"));

            letter.setSentBy(sentBy);
            letter.setSentAt(java.time.LocalDateTime.now());
            joiningLetterRepository.save(letter);

            app.setStatus(ApplicationStatus.JOINING_LETTER_SENT);
            applicationRepository.save(app);

            notificationService.notify(app.getUser().getId(), "JOINING_LETTER", "Joining Letter Issued",
                    "Your joining letter for " + app.getJob().getTitle() + " has been issued. Please review and respond.");
        }

        batch.setStatus(JoiningBatchStatus.JOINING_LETTER_SENT);
        joiningBatchRepository.save(batch);

        auditLogService.log(actingUserId, "JOINING_LETTERS_SENT", "JOINING_BATCH", batchId,
                "Sent joining letters for batch " + batch.getBatchCode() + " (" + members.size() + " candidates)");

        return toResponse(batch, true);
    }

    /** Called by JoiningLetterService after each individual accept/reject response. */
    @Transactional
    public void refreshBatchStatusAfterResponse(Long batchId) {
        JoiningBatch batch = joiningBatchRepository.findById(batchId).orElse(null);
        if (batch == null) return;
        if (batch.getStatus() != JoiningBatchStatus.JOINING_LETTER_SENT
                && batch.getStatus() != JoiningBatchStatus.JOINING_ACCEPTANCE_IN_PROGRESS) {
            return;
        }

        List<JoiningBatchMember> members = joiningBatchMemberRepository.findByBatchIdOrderByLocationPreferenceRankAsc(batchId);
        boolean anyPending = members.stream()
                .anyMatch(m -> m.getApplication().getStatus() == ApplicationStatus.JOINING_LETTER_SENT);

        batch.setStatus(anyPending ? JoiningBatchStatus.JOINING_ACCEPTANCE_IN_PROGRESS : JoiningBatchStatus.READY_FOR_TRAINING);
        joiningBatchRepository.save(batch);
    }

    private String generateBatchCode(Long id, LocalDate joiningDate) {
        return "JB-" + joiningDate.getYear() + "-" + String.format("%05d", id);
    }

    private PdfGenerationService.PdfDocument buildLetterDocument(JobApplication app, JoiningBatch batch, Employee employee) {
        String candidateName = app.getUser().getName();
        String role = app.getJob().getTitle();
        String today = LocalDate.now().format(DATE_FMT);

        List<String> trainingLines = new ArrayList<>(List.of(
                "Training Location: " + batch.getTrainingLocation().getName(),
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
                                "Joining Location: " + batch.getJoiningLocation().getName(),
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
        String letterStatus = joiningLetterRepository.findByApplicationId(app.getId())
                .map(l -> l.getSentAt() != null ? "SENT" : "GENERATED")
                .orElse("NOT_GENERATED");

        return JoiningBatchMemberResponse.builder()
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .locationPreferenceRank(member.getLocationPreferenceRank())
                .applicationStatus(app.getStatus().name())
                .joiningLetterStatus(letterStatus)
                .build();
    }
}
