package com.nexhire.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * An offer letter is now auto-generated (with an attached PDF) the moment an application
 * reaches ASSESSMENT_PASSED, well before HR decides to send it — so sentBy/sentAt/pdfFile
 * are only populated once the corresponding step actually happens.
 */
@Entity
@Table(name = "offer_letters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OfferLetter {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private JobApplication application;

    /** Short human-readable summary of the offer; the authoritative document is pdfFile. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdf_file_id")
    private StoredFile pdfFile;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime generatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by")
    private User sentBy;

    private LocalDateTime sentAt;

    private LocalDateTime respondedAt;
}
