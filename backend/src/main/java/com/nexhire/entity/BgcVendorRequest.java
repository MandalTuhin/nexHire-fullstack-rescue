package com.nexhire.entity;

import com.nexhire.enums.VendorRequestStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/** Record of a background-check request sent to a third-party vendor for a BGC case. */
@Entity
@Table(name = "bgc_vendor_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BgcVendorRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bgc_case_id", nullable = false)
    private BackgroundVerification bgcCase;

    private String vendorName;

    private String vendorLink;

    @Column(length = 500)
    private String requestReference;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by", nullable = false)
    private User sentBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime sentAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private VendorRequestStatus status = VendorRequestStatus.SENT;

    private String remarks;
}
