package com.nexhire.repository;

import com.nexhire.entity.User;
import com.nexhire.enums.LifecycleStatus;
import com.nexhire.enums.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    List<User> findByLifecycleStatus(LifecycleStatus lifecycleStatus);

    long countByRole(UserRole role);

    long countByRoleAndActiveTrue(UserRole role);

    long countByActiveTrue();

    /** ADMIN: paginated user list, avoids loading all ~5000 seeded users at once. */
    @Query("SELECT u FROM User u WHERE " +
            "(:search IS NULL OR LOWER(u.name) LIKE :search OR LOWER(u.email) LIKE :search) " +
            "AND (:role IS NULL OR u.role = :role) " +
            "ORDER BY u.createdAt DESC")
    Page<User> search(@Param("search") String search, @Param("role") UserRole role, Pageable pageable);
}
