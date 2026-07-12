package com.nexhire.repository;

import com.nexhire.entity.JoiningLetter;
import com.nexhire.enums.ApplicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface JoiningLetterRepository extends JpaRepository<JoiningLetter, Long> {

    Optional<JoiningLetter> findByApplicationId(Long applicationId);

    List<JoiningLetter> findByApplicationUserId(Long userId);

    long countBySentAtIsNotNull();

    /** JoiningLetterExpiryService: letters still awaiting a response whose deadline has passed. */
    List<JoiningLetter> findByApplication_StatusAndResponseDeadlineBefore(ApplicationStatus status, LocalDateTime cutoff);
}
