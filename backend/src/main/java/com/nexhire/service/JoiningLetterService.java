package com.nexhire.service;

import com.nexhire.dto.JoiningLetterResponse;
import com.nexhire.entity.Employee;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.JoiningLetter;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.EmployeeRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.JoiningLetterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Individual candidate-facing operations on joining letters. Generation/sending is always
 * batch-wise now (see JoiningBatchService) — this service only covers what remains
 * per-candidate: viewing, downloading, and accepting/rejecting one's own letter.
 *
 * NOTE: the old flow used to deduct hiring budget / training seats and create a Trainee
 * record the instant a candidate accepted their joining letter. That's gone — per context.md's
 * own section boundaries, budget/seat deduction and Trainee creation belong to "TRAINING
 * ASSIGNMENT" (batch-wide, Phase 6), which happens *after* all candidates in a batch have
 * responded (see JoiningBatchService.refreshBatchStatusAfterResponse -> READY_FOR_TRAINING).
 * Accepting here only moves the application to JOINING_ACCEPTED.
 */
@Service
@RequiredArgsConstructor
public class JoiningLetterService {

    private final JoiningLetterRepository joiningLetterRepository;
    private final JobApplicationRepository applicationRepository;
    private final EmployeeRepository employeeRepository;
    private final FileStorageService fileStorageService;
    private final AuditLogService auditLogService;
    private final JoiningBatchService joiningBatchService;

    public List<JoiningLetterResponse> getMyJoiningLetters(Long userId) {
        return joiningLetterRepository.findByApplicationUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public FileStorageService.StoredFileData downloadPdf(Long letterId, Long requestingUserId, boolean isHr) {
        JoiningLetter letter = joiningLetterRepository.findById(letterId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining letter not found with id: " + letterId));
        if (!isHr && !letter.getApplication().getUser().getId().equals(requestingUserId)) {
            throw new InvalidStateTransitionException("You can only view your own joining letter");
        }
        if (letter.getPdfFile() == null) {
            throw new ResourceNotFoundException("Joining letter PDF not available");
        }
        return fileStorageService.retrieve(letter.getPdfFile().getId());
    }

    @Transactional
    public JoiningLetterResponse acceptJoiningLetter(Long letterId, Long userId) {
        JoiningLetter letter = joiningLetterRepository.findById(letterId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining letter not found with id: " + letterId));
        JobApplication application = letter.getApplication();

        if (application.getStatus() != ApplicationStatus.JOINING_LETTER_SENT) {
            throw new InvalidStateTransitionException(
                    "Cannot accept joining letter: application status must be JOINING_LETTER_SENT, current is " + application.getStatus());
        }
        if (!application.getUser().getId().equals(userId)) {
            throw new InvalidStateTransitionException("You can only accept your own joining letter");
        }

        application.setStatus(ApplicationStatus.JOINING_ACCEPTED);
        applicationRepository.save(application);

        letter.setRespondedAt(LocalDateTime.now());
        joiningLetterRepository.save(letter);

        auditLogService.log(userId, "JOINING_ACCEPTED", "APPLICATION", application.getId(),
                "Joining letter accepted by " + application.getUser().getEmail());

        if (letter.getBatch() != null) {
            joiningBatchService.refreshBatchStatusAfterResponse(letter.getBatch().getId());
        }

        return toResponse(letter);
    }

    @Transactional
    public JoiningLetterResponse rejectJoiningLetter(Long letterId, Long userId) {
        JoiningLetter letter = joiningLetterRepository.findById(letterId)
                .orElseThrow(() -> new ResourceNotFoundException("Joining letter not found with id: " + letterId));
        JobApplication application = letter.getApplication();

        if (application.getStatus() != ApplicationStatus.JOINING_LETTER_SENT) {
            throw new InvalidStateTransitionException(
                    "Cannot reject joining letter: application status must be JOINING_LETTER_SENT, current is " + application.getStatus());
        }
        if (!application.getUser().getId().equals(userId)) {
            throw new InvalidStateTransitionException("You can only reject your own joining letter");
        }

        application.setStatus(ApplicationStatus.JOINING_REJECTED);
        applicationRepository.save(application);

        letter.setRespondedAt(LocalDateTime.now());
        joiningLetterRepository.save(letter);

        auditLogService.log(userId, "JOINING_REJECTED", "APPLICATION", application.getId(),
                "Joining letter rejected by " + application.getUser().getEmail());

        if (letter.getBatch() != null) {
            joiningBatchService.refreshBatchStatusAfterResponse(letter.getBatch().getId());
        }

        return toResponse(letter);
    }

    private JoiningLetterResponse toResponse(JoiningLetter letter) {
        JobApplication app = letter.getApplication();
        Employee employee = employeeRepository.findByApplicationId(app.getId()).orElse(null);
        return JoiningLetterResponse.builder()
                .id(letter.getId())
                .applicationId(app.getId())
                .batchId(letter.getBatch() != null ? letter.getBatch().getId() : null)
                .batchCode(letter.getBatch() != null ? letter.getBatch().getBatchCode() : null)
                .employeeCode(employee != null ? employee.getEmployeeCode() : null)
                .jobTitle(app.getJob().getTitle())
                .content(letter.getContent())
                .pdfFileId(letter.getPdfFile() != null ? letter.getPdfFile().getId() : null)
                .joiningDate(letter.getJoiningDate())
                .locationName(letter.getLocation().getName())
                .status(app.getStatus().name())
                .holdReason(app.getHoldReason())
                .generatedAt(letter.getGeneratedAt())
                .sentByName(letter.getSentBy() != null ? letter.getSentBy().getName() : null)
                .sentAt(letter.getSentAt())
                .respondedAt(letter.getRespondedAt())
                .build();
    }
}
