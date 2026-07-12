package com.nexhire.repository;

import com.nexhire.entity.JoiningBatch;
import com.nexhire.enums.JoiningBatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface JoiningBatchRepository extends JpaRepository<JoiningBatch, Long> {

    long countByJoiningLocationId(Long locationId);

    long countByStatus(JoiningBatchStatus status);

    long countByAssignedTrainingIsNotNull();

    /** Used to derive the next sequence number for auto-generated batch names
     *  (see JoiningBatchService.generateBatchName). */
    long countByJoiningLocationIdAndJoiningDateBetween(Long locationId, LocalDate monthStart, LocalDate monthEnd);
}
