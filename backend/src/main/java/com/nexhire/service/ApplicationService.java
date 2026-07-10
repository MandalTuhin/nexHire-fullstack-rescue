package com.nexhire.service;

import com.nexhire.dto.ApplicationResponse;
import com.nexhire.entity.CandidateProfile;
import com.nexhire.entity.Job;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.User;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.DuplicateResourceException;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.BackgroundVerificationRepository;
import com.nexhire.repository.CandidateProfileRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.JobRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ApplicationService {

    private final JobApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserRepository userRepository;
    private final BackgroundVerificationRepository bgvRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final CandidateProfileService candidateProfileService;

    @Transactional
    public ApplicationResponse applyToJob(Long userId, Long jobId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + jobId));

        if (!candidateProfileService.isProfileComplete(userId)) {
            throw new BusinessRuleException(
                    "Complete your profile (personal details, academics, skills, resume, and 3 location preferences) before applying");
        }

        // Defense-in-depth: the frontend already greys out Apply for ineligible candidates,
        // but eligibility is a real business rule and must not rely solely on client-side JS.
        CandidateProfile profile = candidateProfileRepository.findByUserId(userId).orElse(null);
        if (profile == null
                || profile.getTenthPercentage() == null || profile.getTenthPercentage() < 60
                || profile.getTwelfthPercentage() == null || profile.getTwelfthPercentage() < 60
                || profile.getGraduationCgpa() == null || profile.getGraduationCgpa() < 6.0) {
            throw new BusinessRuleException(
                    "You need at least 60% in 10th, 12th, and Graduation to apply for this drive");
        }

        if (applicationRepository.existsByUserIdAndJobId(userId, jobId)) {
            throw new DuplicateResourceException("You have already applied to this job");
        }

        JobApplication application = JobApplication.builder()
                .user(user)
                .job(job)
                .status(ApplicationStatus.APPLIED)
                .build();

        return toResponse(applicationRepository.save(application));
    }

    public List<ApplicationResponse> getMyApplications(Long userId) {
        return applicationRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<ApplicationResponse> getAllApplications() {
        return applicationRepository.findAllByOrderByAppliedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    public ApplicationResponse getApplicationById(Long id) {
        JobApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + id));
        return toResponse(application);
    }

    @Transactional
    public ApplicationResponse startAssessment(Long applicationId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (application.getStatus() != ApplicationStatus.APPLIED) {
            throw new InvalidStateTransitionException(
                    "Cannot start assessment: application status must be APPLIED, current is " + application.getStatus());
        }

        application.setStatus(ApplicationStatus.ASSESSMENT_ASSIGNED);
        return toResponse(applicationRepository.save(application));
    }

    private ApplicationResponse toResponse(JobApplication app) {
        return ApplicationResponse.builder()
                .id(app.getId())
                .userId(app.getUser().getId())
                .userName(app.getUser().getName())
                .userEmail(app.getUser().getEmail())
                .jobId(app.getJob().getId())
                .jobTitle(app.getJob().getTitle())
                .status(app.getStatus().name())
                .holdReason(app.getHoldReason())
                .holdCreatedAt(app.getHoldCreatedAt())
                .holdResolvedAt(app.getHoldResolvedAt())
                .bgvStatus(bgvRepository.findByApplicationId(app.getId())
                        .map(b -> b.getStatus().name()).orElse(null))
                .passoutYear(candidateProfileRepository.findByUserId(app.getUser().getId())
                        .map(p -> p.getGraduationPassingYear()).orElse(null))
                .appliedAt(app.getAppliedAt())
                .updatedAt(app.getUpdatedAt())
                .build();
    }
}
