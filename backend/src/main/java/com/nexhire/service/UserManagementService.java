package com.nexhire.service;

import com.nexhire.dto.CreateUserRequest;
import com.nexhire.dto.PageResponse;
import com.nexhire.dto.UserResponse;
import com.nexhire.entity.ActivityLog;
import com.nexhire.entity.User;
import com.nexhire.enums.UserRole;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.DuplicateResourceException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.ActivityLogRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserManagementService {

    private static final List<UserRole> ADMIN_CREATABLE_ROLES = List.of(UserRole.HR, UserRole.RMG, UserRole.ADMIN);

    private final UserRepository userRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PasswordEncoder passwordEncoder;

    /** ADMIN: paginated/searchable user list — avoids loading all ~5000 seeded users at once. */
    public PageResponse<UserResponse> search(String search, String role, int page, int size) {
        String pattern = (search == null || search.isBlank()) ? null : "%" + search.trim().toLowerCase() + "%";
        UserRole roleFilter = null;
        if (role != null && !role.isBlank()) {
            try {
                roleFilter = UserRole.valueOf(role.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                // unknown role string -> no match, leave filter null so nothing is silently mis-filtered out
            }
        }
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200));
        return PageResponse.of(userRepository.search(pattern, roleFilter, pageable), this::toResponse);
    }

    /** ADMIN: creates an internal user (HR/RMG/Admin — candidates self-register instead).
     *  P-Claude.md "User should be forced to change password after first login": the temp
     *  password is stored encoded like any other, with mustChangePassword=true so the very
     *  next login is required to go through Change Password before anything else. */
    @Transactional
    public UserResponse createUser(CreateUserRequest request, Long adminId) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists: " + request.getEmail());
        }

        UserRole role;
        try {
            role = UserRole.valueOf(request.getRole().trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Invalid role: " + request.getRole());
        }
        if (!ADMIN_CREATABLE_ROLES.contains(role)) {
            throw new BusinessRuleException("Admin can only create HR, RMG, or Admin users — candidates self-register");
        }

        User user = User.builder()
                .name(request.getFullName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone() != null ? request.getPhone() : "")
                .role(role)
                .active(true)
                .mustChangePassword(true)
                .build();
        user = userRepository.save(user);

        User admin = userRepository.findById(adminId).orElse(null);
        activityLogRepository.save(ActivityLog.builder()
                .user(admin != null ? admin : user)
                .actionType("USER_CREATED")
                .description("Created " + role + " user " + user.getEmail())
                .timestamp(LocalDateTime.now())
                .build());

        return toResponse(user);
    }

    /** ADMIN: deactivate a user (prevents login). */
    @Transactional
    public UserResponse deactivate(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setActive(false);
        userRepository.save(user);

        User admin = userRepository.findById(adminId).orElse(null);
        activityLogRepository.save(ActivityLog.builder()
                .user(admin != null ? admin : user)
                .actionType("USER_DEACTIVATED")
                .description("User " + user.getEmail() + " deactivated")
                .timestamp(LocalDateTime.now())
                .build());

        return toResponse(user);
    }

    /** ADMIN: restore a previously-restricted user's access. */
    @Transactional
    public UserResponse reactivate(Long userId, Long adminId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setActive(true);
        userRepository.save(user);

        User admin = userRepository.findById(adminId).orElse(null);
        activityLogRepository.save(ActivityLog.builder()
                .user(admin != null ? admin : user)
                .actionType("USER_REACTIVATED")
                .description("Access restored for " + user.getEmail())
                .timestamp(LocalDateTime.now())
                .build());

        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .lifecycleStatus(user.getLifecycleStatus() != null ? user.getLifecycleStatus().name() : null)
                .active(user.getActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
