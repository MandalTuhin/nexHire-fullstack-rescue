package com.nexhire.repository;

import com.nexhire.entity.BackgroundVerification;
import com.nexhire.enums.BgvStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface BackgroundVerificationRepository extends JpaRepository<BackgroundVerification, Long> {

    Optional<BackgroundVerification> findByApplicationId(Long applicationId);

    List<BackgroundVerification> findByApplicationUserId(Long userId);

    boolean existsByApplicationId(Long applicationId);

    long countByStatus(BgvStatus status);

    long countByStatusNotIn(Collection<BgvStatus> statuses);

    /** HR: paginated/searchable BGC case list, avoids loading every case at once. */
    @Query("SELECT b FROM BackgroundVerification b JOIN b.application a JOIN a.user u WHERE " +
            "(:search IS NULL OR LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search) " +
            "AND (:status IS NULL OR b.status = :status) " +
            "ORDER BY b.updatedAt DESC")
    Page<BackgroundVerification> search(@Param("search") String search, @Param("status") BgvStatus status, Pageable pageable);
}
