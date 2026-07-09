package com.nexhire.service;

import com.nexhire.dto.TraineeResponse;
import com.nexhire.dto.TrainingProgressRequest;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.Trainee;
import com.nexhire.entity.TrainingRecord;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.LifecycleStatus;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.TraineeRepository;
import com.nexhire.repository.TrainingRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TrainingService {

    private final TraineeRepository traineeRepository;
    private final TrainingRecordRepository trainingRecordRepository;
    private final JobApplicationRepository applicationRepository;
    private final NotificationService notificationService;

    /** HR: list all trainees with their training records. */
    public List<TraineeResponse> getAllTrainees() {
        return traineeRepository.findAll().stream().map(this::toResponse).toList();
    }

    /** EMPLOYEE: own training record. */
    public TraineeResponse getMyTraining(Long userId) {
        Trainee trainee = traineeRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("No trainee record found for current user"));
        return toResponse(trainee);
    }

    /** HR: update training progress. Requires user lifecycleStatus=TRAINEE. */
    @Transactional
    public TraineeResponse updateProgress(Long traineeId, TrainingProgressRequest request) {
        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));

        if (trainee.getUser().getLifecycleStatus() != LifecycleStatus.TRAINEE) {
            throw new InvalidStateTransitionException(
                    "Cannot update training: user lifecycle status must be TRAINEE");
        }

        TrainingRecord record = trainingRecordRepository.findByTraineeId(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Training record not found for trainee: " + traineeId));

        record.setProgress(request.getProgress());
        if (request.getTopic() != null) {
            record.setTopic(request.getTopic());
        }
        trainingRecordRepository.save(record);

        return toResponse(trainee);
    }

    /** HR: mark training complete -> applicationStatus=TRAINING_COMPLETED. */
    @Transactional
    public TraineeResponse completeTraining(Long traineeId) {
        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));

        if (trainee.getUser().getLifecycleStatus() != LifecycleStatus.TRAINEE) {
            throw new InvalidStateTransitionException(
                    "Cannot complete training: user lifecycle status must be TRAINEE");
        }

        TrainingRecord record = trainingRecordRepository.findByTraineeId(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Training record not found for trainee: " + traineeId));
        record.setProgress(100);
        record.setCompleted(true);
        trainingRecordRepository.save(record);

        JobApplication application = trainee.getApplication();
        application.setStatus(ApplicationStatus.TRAINING_COMPLETED);
        applicationRepository.save(application);

        // Notify trainee
        notificationService.notify(trainee.getUser().getId(), "TRAINING_COMPLETED",
                "Training Completed",
                "Congratulations! Your training is complete. You are now eligible for project allocation.");

        return toResponse(trainee);
    }

    private TraineeResponse toResponse(Trainee trainee) {
        TrainingRecord record = trainingRecordRepository.findByTraineeId(trainee.getId()).orElse(null);
        JobApplication app = trainee.getApplication();
        return TraineeResponse.builder()
                .traineeId(trainee.getId())
                .userId(trainee.getUser().getId())
                .applicationId(app.getId())
                .candidateName(trainee.getUser().getName())
                .candidateEmail(trainee.getUser().getEmail())
                .jobTitle(app.getJob().getTitle())
                .applicationStatus(app.getStatus().name())
                .progress(record != null ? record.getProgress() : 0)
                .topic(record != null ? record.getTopic() : null)
                .completed(record != null ? record.getCompleted() : false)
                .joinedAt(trainee.getJoinedAt())
                .updatedAt(record != null ? record.getUpdatedAt() : null)
                .build();
    }
}
