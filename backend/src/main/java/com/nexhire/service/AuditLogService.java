package com.nexhire.service;

import com.nexhire.entity.ActivityLog;
import com.nexhire.entity.User;
import com.nexhire.repository.ActivityLogRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Central place to write ActivityLog rows. Every new bulk action / automated status
 * transition added for the onboarding-automation workflow should call this instead of
 * writing to ActivityLogRepository directly, so audit coverage stays consistent.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private final ActivityLogRepository activityLogRepository;
    private final UserRepository userRepository;

    @Transactional
    public void log(Long actingUserId, String actionType, String description) {
        log(actingUserId, actionType, null, null, description);
    }

    @Transactional
    public void log(Long actingUserId, String actionType, String entityType, Long entityId, String description) {
        User actor = actingUserId == null ? null : userRepository.findById(actingUserId).orElse(null);
        activityLogRepository.save(ActivityLog.builder()
                .user(actor)
                .actionType(actionType)
                .description(description)
                .entityType(entityType)
                .entityId(entityId)
                .timestamp(LocalDateTime.now())
                .build());
    }
}
