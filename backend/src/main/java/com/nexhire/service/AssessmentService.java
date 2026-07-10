package com.nexhire.service;

import com.nexhire.dto.AssessmentRequest;
import com.nexhire.entity.AssessmentResult;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.User;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.AssessmentResultRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentResultRepository assessmentResultRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final OfferGenerationService offerGenerationService;

    @Transactional
    public AssessmentResult enterScore(Long applicationId, AssessmentRequest request, Long evaluatorId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (application.getStatus() != ApplicationStatus.ASSESSMENT_ASSIGNED) {
            throw new InvalidStateTransitionException(
                    "Cannot enter score: application status must be ASSESSMENT_ASSIGNED, current is " + application.getStatus());
        }

        User evaluator = userRepository.findById(evaluatorId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator not found"));

        AssessmentResult result = AssessmentResult.builder()
                .application(application)
                .score(request.getScore())
                .remarks(request.getRemarks())
                .evaluatedBy(evaluator)
                .evaluatedAt(LocalDateTime.now())
                .build();

        application.setStatus(ApplicationStatus.ASSESSMENT_SCORE_UPLOADED);
        applicationRepository.save(application);

        return assessmentResultRepository.save(result);
    }

    @Transactional
    public JobApplication qualify(Long applicationId, Long actingUserId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (application.getStatus() != ApplicationStatus.ASSESSMENT_SCORE_UPLOADED) {
            throw new InvalidStateTransitionException(
                    "Cannot qualify: application status must be ASSESSMENT_SCORE_UPLOADED, current is " + application.getStatus());
        }

        application.setStatus(ApplicationStatus.ASSESSMENT_PASSED);
        applicationRepository.save(application);

        // Auto-generate the offer letter — HR should never have to do this one by one.
        offerGenerationService.generateIfAbsent(application, actingUserId);
        return applicationRepository.save(application);
    }

    @Transactional
    public JobApplication reject(Long applicationId) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (application.getStatus() != ApplicationStatus.ASSESSMENT_SCORE_UPLOADED) {
            throw new InvalidStateTransitionException(
                    "Cannot reject: application status must be ASSESSMENT_SCORE_UPLOADED, current is " + application.getStatus());
        }

        application.setStatus(ApplicationStatus.ASSESSMENT_FAILED);
        return applicationRepository.save(application);
    }
}
