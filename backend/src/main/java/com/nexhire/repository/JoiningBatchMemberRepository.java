package com.nexhire.repository;

import com.nexhire.entity.JoiningBatchMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JoiningBatchMemberRepository extends JpaRepository<JoiningBatchMember, Long> {

    List<JoiningBatchMember> findByBatchIdOrderByLocationPreferenceRankAsc(Long batchId);

    boolean existsBySelectedUserId(Long selectedUserId);

    Optional<JoiningBatchMember> findByBatchIdAndApplicationId(Long batchId, Long applicationId);
}
