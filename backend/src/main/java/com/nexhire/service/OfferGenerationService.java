package com.nexhire.service;

import com.nexhire.entity.JobApplication;
import com.nexhire.entity.OfferLetter;
import com.nexhire.entity.StoredFile;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.FileCategory;
import com.nexhire.repository.OfferLetterRepository;
import com.nexhire.repository.StoredFileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Auto-generates the offer letter (PDF + OfferLetter record) the moment an application
 * reaches ASSESSMENT_PASSED, from any path (individual qualify, bulk shortlist, or the
 * Excel bulk-upload cutoff path) — per context.md: "HR should not manually generate offer
 * letters one by one." Sending it to the candidate remains a separate, explicit HR action
 * (OfferService.sendOffer).
 */
@Service
@RequiredArgsConstructor
public class OfferGenerationService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    private final OfferLetterRepository offerLetterRepository;
    private final StoredFileRepository storedFileRepository;
    private final FileStorageService fileStorageService;
    private final PdfGenerationService pdfGenerationService;

    /** Idempotent: if an offer already exists for this application, it is left untouched. */
    @Transactional
    public void generateIfAbsent(JobApplication application, Long actingUserId) {
        if (offerLetterRepository.findByApplicationId(application.getId()).isPresent()) {
            return;
        }

        byte[] pdfBytes = pdfGenerationService.generate(buildDocument(application));
        String fileName = "OfferLetter_" + application.getId() + ".pdf";
        Long fileId = fileStorageService.storeGenerated(
                pdfBytes, fileName, "application/pdf", FileCategory.OFFER_LETTER, actingUserId);
        StoredFile pdfFile = storedFileRepository.getReferenceById(fileId);

        OfferLetter offer = OfferLetter.builder()
                .application(application)
                .content(summary(application))
                .pdfFile(pdfFile)
                .build();
        offerLetterRepository.save(offer);

        application.setStatus(ApplicationStatus.OFFER_GENERATED);
    }

    private String summary(JobApplication application) {
        return "Offer letter auto-generated for " + application.getUser().getName()
                + " — " + application.getJob().getTitle() + ".";
    }

    private PdfGenerationService.PdfDocument buildDocument(JobApplication application) {
        String candidateName = application.getUser().getName();
        String role = application.getJob().getTitle();
        String today = java.time.LocalDate.now().format(DATE_FMT);

        return new PdfGenerationService.PdfDocument(
                "Offer of Employment",
                List.of(
                        new PdfGenerationService.PdfSection(null, List.of(
                                "Date: " + today,
                                "",
                                "Dear " + candidateName + ","
                        )),
                        new PdfGenerationService.PdfSection("Offer Details", List.of(
                                "We are pleased to offer you the position of " + role + " with NexHire.",
                                "This offer is made on the basis of your performance in our selection process " +
                                        "and is subject to the successful completion of a background verification check."
                        )),
                        new PdfGenerationService.PdfSection("Compensation", List.of(
                                "Compensation and benefits will be as per the standard company policy for this role, " +
                                        "details of which will be shared separately by Human Resources."
                        )),
                        new PdfGenerationService.PdfSection("Terms & Conditions", List.of(
                                "1. This offer is contingent upon successful completion of background verification.",
                                "2. You are expected to join on the date communicated to you in your joining letter.",
                                "3. This offer is non-transferable and confidential.",
                                "4. Employment is subject to the company's standard policies and code of conduct."
                        )),
                        new PdfGenerationService.PdfSection("Acceptance Instructions", List.of(
                                "Please log in to the NexHire candidate portal and accept or reject this offer. " +
                                        "Accepting this offer will automatically initiate your background verification process."
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
}
