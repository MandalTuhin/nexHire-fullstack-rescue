package com.nexhire.service;

import com.nexhire.dto.*;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.BgcDocumentStatus;
import com.nexhire.enums.BgvStatus;
import com.nexhire.enums.FileCategory;
import com.nexhire.enums.VendorRequestStatus;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.DuplicateResourceException;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BgvService {

    private final BackgroundVerificationRepository bgvRepository;
    private final JobApplicationRepository applicationRepository;
    private final OfferLetterRepository offerLetterRepository;
    private final BgcDocumentRepository documentRepository;
    private final BgcVendorRequestRepository vendorRequestRepository;
    private final UserRepository userRepository;
    private final StoredFileRepository storedFileRepository;
    private final FileStorageService fileStorageService;
    private final EmployeeSelectionService employeeSelectionService;
    private final AuditLogService auditLogService;
    private final ActivityLogService activityLogService;

    /** Auto-triggered the instant a candidate accepts their offer — context.md: "BGC starts
     *  automatically after offer acceptance." Idempotent (no-ops if a case already exists). */
    @Transactional
    public void autoInitiate(JobApplication application) {
        if (bgvRepository.existsByApplicationId(application.getId())) {
            return;
        }
        bgvRepository.save(BackgroundVerification.builder()
                .application(application)
                .status(BgvStatus.DOCUMENTS_PENDING)
                .build());
        application.setStatus(ApplicationStatus.BGC_DOCUMENTS_PENDING);
    }

    /** HR manual fallback path (edge cases outside the normal offer-accept flow). */
    @Transactional
    public BgvResponse initiate(Long applicationId, String vendorName) {
        JobApplication application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (bgvRepository.existsByApplicationId(applicationId)) {
            throw new DuplicateResourceException("BGC already initiated for this application");
        }

        BackgroundVerification bgv = BackgroundVerification.builder()
                .application(application)
                .status(BgvStatus.INITIATED)
                .vendorName(vendorName)
                .build();
        bgv = bgvRepository.save(bgv);

        application.setStatus(ApplicationStatus.BGC_INITIATED);
        applicationRepository.save(application);

        return toResponse(bgv);
    }

    public List<BgvResponse> getAll() {
        return bgvRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<BgvResponse> getMine(Long userId) {
        return bgvRepository.findByApplicationUserId(userId).stream().map(this::toResponse).toList();
    }

    public BgvResponse getByApplication(Long applicationId) {
        return toResponse(findCase(applicationId));
    }

    @Transactional(readOnly = true)
    public BgcCaseDetailResponse getDetail(Long id) {
        BackgroundVerification bgv = bgvRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BGC case not found with id: " + id));
        JobApplication app = bgv.getApplication();

        LocalDateTime offerAcceptedAt = offerLetterRepository.findByApplicationId(app.getId())
                .map(OfferLetter::getRespondedAt).orElse(null);

        return BgcCaseDetailResponse.builder()
                .bgcCaseId(bgv.getId())
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .candidatePhone(app.getUser().getPhone())
                .jobTitle(app.getJob().getTitle())
                .status(bgv.getStatus().name())
                .vendorName(bgv.getVendorName())
                .remarks(bgv.getRemarks())
                .initiatedAt(bgv.getInitiatedAt())
                .completedAt(bgv.getCompletedAt())
                .offerAcceptedAt(offerAcceptedAt)
                .documents(documentRepository.findByBgcCaseIdOrderByUploadedAtDesc(bgv.getId()).stream()
                        .map(this::toDocResponse).toList())
                .vendorRequests(vendorRequestRepository.findByBgcCaseIdOrderBySentAtDesc(bgv.getId()).stream()
                        .map(this::toVendorResponse).toList())
                .auditHistory(activityLogService.getLogsForEntity("APPLICATION", app.getId()))
                .build();
    }

    @Transactional
    public BgvResponse updateStatus(Long id, BgvUpdateRequest request, Long actingUserId) {
        BackgroundVerification bgv = bgvRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("BGC case not found with id: " + id));

        BgvStatus newStatus;
        try {
            newStatus = BgvStatus.valueOf(request.getStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Invalid BGC status: " + request.getStatus());
        }

        applyStatus(bgv, newStatus, request.getRemarks(), actingUserId);
        if (request.getVendorName() != null) {
            bgv.setVendorName(request.getVendorName());
        }
        bgvRepository.save(bgv);

        return toResponse(bgv);
    }

    /** Shared by the individual status update and the Excel bulk path. Mutates both the BGC
     *  case and its JobApplication; on CLEARED, transactionally creates Employee+SelectedUser. */
    void applyStatus(BackgroundVerification bgv, BgvStatus newStatus, String remarks, Long actingUserId) {
        bgv.setStatus(newStatus);
        if (remarks != null) {
            bgv.setRemarks(remarks);
        }
        if (newStatus == BgvStatus.CLEARED || newStatus == BgvStatus.FAILED) {
            bgv.setCompletedAt(LocalDateTime.now());
        }

        JobApplication application = bgv.getApplication();
        ApplicationStatus mapped = mapToApplicationStatus(newStatus);
        if (mapped != null) {
            application.setStatus(mapped);
        }

        if (newStatus == BgvStatus.CLEARED) {
            employeeSelectionService.createIfAbsent(application);
        }
        applicationRepository.save(application);

        auditLogService.log(actingUserId, "BGC_STATUS_UPDATED", "APPLICATION", application.getId(),
                "BGC case #" + bgv.getId() + " (" + application.getUser().getEmail() + ") status changed to " + newStatus
                        + (remarks != null && !remarks.isBlank() ? " (" + remarks + ")" : ""));
    }

    private ApplicationStatus mapToApplicationStatus(BgvStatus status) {
        return switch (status) {
            case DOCUMENTS_PENDING -> ApplicationStatus.BGC_DOCUMENTS_PENDING;
            case DOCUMENTS_SUBMITTED -> ApplicationStatus.BGC_DOCUMENTS_SUBMITTED;
            case VERIFICATION_IN_PROGRESS, RECHECK_REQUIRED -> ApplicationStatus.BGC_VERIFICATION_IN_PROGRESS;
            case CLEARED -> ApplicationStatus.BGC_CLEARED;
            case FAILED -> ApplicationStatus.BGC_FAILED;
            case INITIATED, NOT_INITIATED, ON_HOLD -> null;
        };
    }

    // ─── Documents ──────────────────────────────────────────────────────────────

    @Transactional
    public BgcDocumentResponse uploadDocument(Long applicationId, String documentType, MultipartFile file, Long uploaderUserId) {
        BackgroundVerification bgv = findCase(applicationId);
        if (bgv.getStatus() != BgvStatus.DOCUMENTS_PENDING && bgv.getStatus() != BgvStatus.DOCUMENTS_SUBMITTED) {
            throw new InvalidStateTransitionException(
                    "This BGC case is not currently accepting documents (status: " + bgv.getStatus() + ")");
        }

        Long fileId = fileStorageService.store(file, FileCategory.BGC_DOCUMENT, uploaderUserId);
        BgcDocument doc = documentRepository.save(BgcDocument.builder()
                .bgcCase(bgv)
                .storedFile(storedFileRepository.getReferenceById(fileId))
                .documentType(documentType)
                .build());

        if (bgv.getStatus() == BgvStatus.DOCUMENTS_PENDING) {
            applyStatus(bgv, BgvStatus.DOCUMENTS_SUBMITTED, null, uploaderUserId);
            bgvRepository.save(bgv);
        }

        auditLogService.log(uploaderUserId, "BGC_DOCUMENT_UPLOADED", "APPLICATION", applicationId,
                "Uploaded BGC document: " + documentType);

        return toDocResponse(doc);
    }

    @Transactional(readOnly = true)
    public List<BgcDocumentResponse> getDocuments(Long bgcCaseId) {
        return documentRepository.findByBgcCaseIdOrderByUploadedAtDesc(bgcCaseId).stream()
                .map(this::toDocResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<BgcDocumentResponse> getMyDocuments(Long userId, Long applicationId) {
        BackgroundVerification bgv = findCase(applicationId);
        if (!bgv.getApplication().getUser().getId().equals(userId)) {
            throw new InvalidStateTransitionException("You can only view your own documents");
        }
        return getDocuments(bgv.getId());
    }

    @Transactional
    public BgcDocumentResponse reviewDocument(Long documentId, BgcDocumentReviewRequest request, Long reviewerUserId) {
        BgcDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));

        BgcDocumentStatus status;
        try {
            status = BgcDocumentStatus.valueOf(request.getStatus().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Invalid document status: " + request.getStatus());
        }

        doc.setStatus(status);
        doc.setRemarks(request.getRemarks());
        doc.setReviewedAt(LocalDateTime.now());
        documentRepository.save(doc);

        if (status == BgcDocumentStatus.REUPLOAD_REQUIRED) {
            BackgroundVerification bgv = doc.getBgcCase();
            applyStatus(bgv, BgvStatus.DOCUMENTS_PENDING, "Re-upload requested: " + doc.getDocumentType(), reviewerUserId);
            bgvRepository.save(bgv);
        }

        auditLogService.log(reviewerUserId, "BGC_DOCUMENT_REVIEWED", "APPLICATION",
                doc.getBgcCase().getApplication().getId(),
                "Document '" + doc.getDocumentType() + "' marked " + status);

        return toDocResponse(doc);
    }

    public FileStorageService.StoredFileData downloadDocument(Long documentId, Long requestingUserId, boolean isHr) {
        BgcDocument doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with id: " + documentId));
        if (!isHr && !doc.getBgcCase().getApplication().getUser().getId().equals(requestingUserId)) {
            throw new InvalidStateTransitionException("You can only view your own documents");
        }
        return fileStorageService.retrieve(doc.getStoredFile().getId());
    }

    // ─── Vendor requests ────────────────────────────────────────────────────────

    @Transactional
    public BgcVendorRequestResponse sendToVendor(Long bgcCaseId, BgcVendorRequestCreate request, Long sentByUserId) {
        BackgroundVerification bgv = bgvRepository.findById(bgcCaseId)
                .orElseThrow(() -> new ResourceNotFoundException("BGC case not found with id: " + bgcCaseId));

        if (bgv.getStatus() != BgvStatus.DOCUMENTS_SUBMITTED && bgv.getStatus() != BgvStatus.RECHECK_REQUIRED) {
            throw new InvalidStateTransitionException(
                    "Documents must be submitted before sending to a vendor (status: " + bgv.getStatus() + ")");
        }

        User sentBy = userRepository.findById(sentByUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        BgcVendorRequest vendorRequest = vendorRequestRepository.save(BgcVendorRequest.builder()
                .bgcCase(bgv)
                .vendorName(request.getVendorName())
                .vendorLink(request.getVendorLink())
                .requestReference(request.getRequestReference())
                .remarks(request.getRemarks())
                .sentBy(sentBy)
                .status(VendorRequestStatus.SENT)
                .build());

        bgv.setVendorName(request.getVendorName());
        applyStatus(bgv, BgvStatus.VERIFICATION_IN_PROGRESS, null, sentByUserId);
        bgvRepository.save(bgv);

        auditLogService.log(sentByUserId, "BGC_VENDOR_REQUEST_SENT", "APPLICATION", bgv.getApplication().getId(),
                "Sent to vendor: " + request.getVendorName());

        return toVendorResponse(vendorRequest);
    }

    public List<BgcVendorRequestResponse> getVendorRequests(Long bgcCaseId) {
        return vendorRequestRepository.findByBgcCaseIdOrderBySentAtDesc(bgcCaseId).stream()
                .map(this::toVendorResponse).toList();
    }

    // ─── Mapping ──────────────────────────────────────────────────────────────

    private BackgroundVerification findCase(Long applicationId) {
        return bgvRepository.findByApplicationId(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("BGC case not found for application: " + applicationId));
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

    private BgcDocumentResponse toDocResponse(BgcDocument doc) {
        return BgcDocumentResponse.builder()
                .id(doc.getId())
                .bgcCaseId(doc.getBgcCase().getId())
                .applicationId(doc.getBgcCase().getApplication().getId())
                .documentType(doc.getDocumentType())
                .fileName(doc.getStoredFile().getFileName())
                .status(doc.getStatus().name())
                .remarks(doc.getRemarks())
                .uploadedAt(doc.getUploadedAt())
                .reviewedAt(doc.getReviewedAt())
                .build();
    }

    private BgcVendorRequestResponse toVendorResponse(BgcVendorRequest vr) {
        return BgcVendorRequestResponse.builder()
                .id(vr.getId())
                .bgcCaseId(vr.getBgcCase().getId())
                .vendorName(vr.getVendorName())
                .vendorLink(vr.getVendorLink())
                .requestReference(vr.getRequestReference())
                .sentByName(vr.getSentBy().getName())
                .sentAt(vr.getSentAt())
                .status(vr.getStatus().name())
                .remarks(vr.getRemarks())
                .build();
    }
}
