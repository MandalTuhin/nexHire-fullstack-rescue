package com.nexhire.entity;

import com.nexhire.enums.FileCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Storage-abstraction record for uploaded binary documents (resumes, BGC documents, etc).
 * Backed by Postgres BYTEA today; swap DbFileStorageService for a filesystem/cloud
 * implementation later without touching callers (they only depend on FileStorageService).
 */
@Entity
@Table(name = "stored_files")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StoredFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false)
    private Long fileSize;

    @Lob
    @Column(nullable = false)
    private byte[] data;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FileCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;
}
