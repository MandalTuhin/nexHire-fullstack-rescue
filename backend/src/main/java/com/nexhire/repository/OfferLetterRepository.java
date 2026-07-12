package com.nexhire.repository;

import com.nexhire.entity.OfferLetter;
import com.nexhire.enums.ApplicationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OfferLetterRepository extends JpaRepository<OfferLetter, Long> {

    Optional<OfferLetter> findByApplicationId(Long applicationId);

    List<OfferLetter> findByApplicationUserId(Long userId);

    long countBySentAtIsNotNull();

    /** HR: paginated/searchable offer list, sorted by assessment score desc, avoids loading every offer at once. */
    @Query("SELECT o FROM OfferLetter o JOIN o.application a JOIN a.user u " +
            "LEFT JOIN AssessmentResult ar ON ar.application = a WHERE " +
            "(:search IS NULL OR LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search) " +
            "AND (:status IS NULL OR a.status = :status) " +
            "ORDER BY COALESCE(ar.score, -1) DESC")
    Page<OfferLetter> search(@Param("search") String search, @Param("status") ApplicationStatus status, Pageable pageable);

    /** Lightweight id list (for "Select Top N / Select All" bulk-send), sorted by score desc,
     *  independent of the paginated display so those actions still see the whole eligible set. */
    @Query("SELECT a.id FROM OfferLetter o JOIN o.application a " +
            "LEFT JOIN AssessmentResult ar ON ar.application = a " +
            "WHERE a.status = :status " +
            "ORDER BY COALESCE(ar.score, -1) DESC")
    List<Long> findApplicationIdsByStatusOrderByScoreDesc(@Param("status") ApplicationStatus status);
}
