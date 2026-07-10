package com.nexhire.entity;

import com.nexhire.enums.UploadStatus;
import com.nexhire.enums.UploadType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "bulk_upload_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BulkUploadLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UploadType uploadType;

    @Column(nullable = false)
    private String fileName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by", nullable = false)
    private User uploadedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    @Column(nullable = false)
    private Integer totalRows;

    @Column(nullable = false)
    private Integer successRows;

    @Column(nullable = false)
    private Integer failedRows;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UploadStatus status;

    @Column(length = 2000)
    private String remarks;

    /** Optional scoping FK (e.g. a JoiningBatch id for TRAINEE_RESULT uploads) — nullable
     *  since ASSESSMENT_RESULT/BGC_RESULT uploads aren't scoped to a single entity. */
    private Long relatedEntityId;
}
