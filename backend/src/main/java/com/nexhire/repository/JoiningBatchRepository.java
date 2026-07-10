package com.nexhire.repository;

import com.nexhire.entity.JoiningBatch;
import com.nexhire.enums.JoiningBatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JoiningBatchRepository extends JpaRepository<JoiningBatch, Long> {

    long countByJoiningLocationId(Long locationId);

    long countByStatus(JoiningBatchStatus status);

    long countByAssignedTrainingIsNotNull();
}
