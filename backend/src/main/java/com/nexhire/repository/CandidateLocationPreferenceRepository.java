package com.nexhire.repository;

import com.nexhire.entity.CandidateLocationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CandidateLocationPreferenceRepository extends JpaRepository<CandidateLocationPreference, Long> {

    List<CandidateLocationPreference> findByUserIdOrderByPreferenceRankAsc(Long userId);

    void deleteByUserId(Long userId);
}
