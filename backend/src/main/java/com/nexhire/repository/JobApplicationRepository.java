package com.nexhire.repository;

import com.nexhire.entity.JobApplication;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.BgvStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JobApplicationRepository extends JpaRepository<JobApplication, Long> {

    List<JobApplication> findByUserId(Long userId);

    Optional<JobApplication> findByUserIdAndJobId(Long userId, Long jobId);

    List<JobApplication> findByStatus(ApplicationStatus status);

    long countByStatus(ApplicationStatus status);

    long countByStatusIn(List<ApplicationStatus> statuses);

    List<JobApplication> findAllByOrderByAppliedAtDesc();

    boolean existsByUserIdAndJobId(Long userId, Long jobId);

    /**
     * High-volume HR search: candidate/profile/assessment/offer/BGC/joining data joined in one
     * pass with all-optional predicates. Sort is applied by Pageable (see JobApplicationSortMapper
     * for the whitelist of sortable expressions that resolve against this query's aliases).
     */
    @Query("""
            SELECT DISTINCT a FROM JobApplication a
            JOIN a.user u
            JOIN a.job j
            LEFT JOIN CandidateProfile cp ON cp.user = u
            LEFT JOIN AssessmentResult ar ON ar.application = a
            LEFT JOIN OfferLetter ol ON ol.application = a
            LEFT JOIN BackgroundVerification bv ON bv.application = a
            LEFT JOIN JoiningLetter jl ON jl.application = a
            WHERE (:search IS NULL OR LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search OR u.phone LIKE :search)
              AND (:applicationId IS NULL OR a.id = :applicationId)
              AND (:statuses IS NULL OR a.status IN :statuses)
              AND (:profileCompleted IS NULL OR COALESCE(cp.profileCompleted, false) = :profileCompleted)
              AND (:qualification IS NULL OR LOWER(COALESCE(cp.graduationDegree, '')) LIKE :qualification)
              AND (:locationPreference IS NULL OR EXISTS (
                    SELECT 1 FROM CandidateLocationPreference clp
                    WHERE clp.user = u AND LOWER(clp.locationName) = :locationPreference))
              AND (:scoreMin IS NULL OR ar.score >= :scoreMin)
              AND (:scoreMax IS NULL OR ar.score <= :scoreMax)
              AND (:bgcStatus IS NULL OR bv.status = :bgcStatus)
            """)
    Page<JobApplication> search(
            @Param("search") String search,
            @Param("applicationId") Long applicationId,
            @Param("statuses") List<ApplicationStatus> statuses,
            @Param("profileCompleted") Boolean profileCompleted,
            @Param("qualification") String qualification,
            @Param("locationPreference") String locationPreference,
            @Param("scoreMin") Double scoreMin,
            @Param("scoreMax") Double scoreMax,
            @Param("bgcStatus") BgvStatus bgcStatus,
            Pageable pageable);

    List<JobApplication> findByIdIn(List<Long> ids);
}
