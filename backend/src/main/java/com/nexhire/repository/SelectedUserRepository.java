package com.nexhire.repository;

import com.nexhire.entity.SelectedUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SelectedUserRepository extends JpaRepository<SelectedUser, Long> {

    Optional<SelectedUser> findByApplicationId(Long applicationId);

    boolean existsByApplicationId(Long applicationId);

    List<SelectedUser> findByStatus(com.nexhire.enums.SelectedStatus status);
}
