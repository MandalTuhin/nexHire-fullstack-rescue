package com.nexhire.service;

import com.nexhire.dto.BgvResponse;
import com.nexhire.dto.BgvUpdateRequest;
import com.nexhire.entity.BackgroundVerification;
import com.nexhire.entity.JobApplication;
import com.nexhire.enums.BgvStatus;
import com.nexhire.exception.DuplicateResourceException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.BackgroundVerificationRepository;
import com.nexhire.repository.JobApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BgvService {

    private final BackgroundVerificationRepository bgvRepository;
    private final JobApplicationRepository applicationRepository;

    /** HR initiates a BGV record for an application (third-party will process it). */
    @Transactional
    public BgvResponse initiate(Long applicationId, String vendorName) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (bgvRepository.existsByApplicationId(applicationId)) {
            throw new DuplicateResourceException("BGV already initiated for this application");
        }

        BackgroundVerification bgv = BackgroundVerification.builder()
                .application(application)
                .status(BgvStatus.PENDING)
                .vendorName(vendorName)
                .build();

        return toResponse(bgvRepository.save(bgv));
    }

    /** HR lists all BGV records. */
    public List<BgvResponse> getAll() {
        return bgvRepository.findAll().stream().map(this::toResponse).toList();
    }

    /** Candidate views own BGV records. */
    public List<BgvResponse> getMine(Long userId) {
        return bgvRepository.findByApplicationUserId(userId).stream().map(this::toResponse).toList();
    }

    public BgvResponse getByApplication(Long applicationId) {
        BackgroundVerification bgv = bgvRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("BGV not found for application: " + applicationId));
        return toResponse(bgv);
    }

    /**
     * Update BGV status. Simulates the third-party vendor callback / HR manual update.
     */
    @Transactional
    public BgvResponse updateStatus(Long id, BgvUpdateRequest request) {
        BackgroundVerification bgv = bgvRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BGV not found with id: " + id));

        BgvStatus newStatus;
        try {
            newStatus = BgvStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException e) {
            throw new ResourceNotFoundException("Invalid BGV status: " + request.getStatus());
        }

        bgv.setStatus(newStatus);
        if (request.getRemarks() != null) {
            bgv.setRemarks(request.getRemarks());
        }
        if (request.getVendorName() != null) {
            bgv.setVendorName(request.getVendorName());
        }
        if (newStatus == BgvStatus.CLEARED || newStatus == BgvStatus.FAILED) {
            bgv.setCompletedAt(LocalDateTime.now());
        }

        return toResponse(bgvRepository.save(bgv));
    }

    private BgvResponse toResponse(BackgroundVerification bgv) {
        JobApplication app = bgv.getApplication();
        return BgvResponse.builder()
                .id(bgv.getId())
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .jobTitle(app.getJob().getTitle())
                .status(bgv.getStatus().name())
                .vendorName(bgv.getVendorName())
                .remarks(bgv.getRemarks())
                .initiatedAt(bgv.getInitiatedAt())
                .completedAt(bgv.getCompletedAt())
                .updatedAt(bgv.getUpdatedAt())
                .build();
    }
}
