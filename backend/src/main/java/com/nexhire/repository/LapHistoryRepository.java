package com.nexhire.repository;

import com.nexhire.entity.LapHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LapHistoryRepository extends JpaRepository<LapHistory, Long> {

    List<LapHistory> findByTraineeIdOrderByCreatedAtDesc(Long traineeId);
}
