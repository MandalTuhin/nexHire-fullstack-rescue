package com.nexhire.entity;

import com.nexhire.enums.BgcDocumentStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** A single document the candidate uploaded for their background verification case. */
@Entity
@Table(name = "bgc_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgcDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bgc_case_id", nullable = false)
    private BackgroundVerification bgcCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stored_file_id", nullable = false)
    private StoredFile storedFile;

    /** Free-form (e.g. GOVT_ID, ADDRESS_PROOF, EDUCATION_CERTIFICATE) — not a fixed enum
     *  since the required-document checklist isn't modeled elsewhere in the domain. */
    @Column(nullable = false)
    private String documentType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BgcDocumentStatus status = BgcDocumentStatus.PENDING_REVIEW;

    private String remarks;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    private LocalDateTime reviewedAt;
}
