package com.nexhire.controller;

import com.nexhire.dto.TraineeResponse;
import com.nexhire.dto.TrainingProgressRequest;
import com.nexhire.service.TrainingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/training")
@RequiredArgsConstructor
public class TrainingController {

    private final TrainingService trainingService;

    /** HR: list all trainees. */
    @GetMapping("/trainees")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<List<TraineeResponse>> getAllTrainees() {
        return ResponseEntity.ok(trainingService.getAllTrainees());
    }

    /** EMPLOYEE: own training record. */
    @GetMapping("/my")
    @PreAuthorize("hasRole('EMPLOYEE')")
    public ResponseEntity<TraineeResponse> getMyTraining(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(trainingService.getMyTraining(userId));
    }

    /** HR: update training progress. */
    @PutMapping("/{traineeId}/progress")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<TraineeResponse> updateProgress(
            @PathVariable Long traineeId,
            @Valid @RequestBody TrainingProgressRequest request) {
        return ResponseEntity.ok(trainingService.updateProgress(traineeId, request));
    }

    /** HR: mark training complete. */
    @PutMapping("/{traineeId}/complete")
    @PreAuthorize("hasRole('HR')")
    public ResponseEntity<TraineeResponse> completeTraining(@PathVariable Long traineeId) {
        return ResponseEntity.ok(trainingService.completeTraining(traineeId));
    }
}
