package com.nexhire.service;

import com.nexhire.dto.ActivityLogResponse;
import com.nexhire.entity.ActivityLog;
import com.nexhire.repository.ActivityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ActivityLogService {

    private final ActivityLogRepository activityLogRepository;

    /** ADMIN: activity logs in reverse chronological order. */
    public List<ActivityLogResponse> getLogs() {
        return activityLogRepository.findAllByOrderByTimestampDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    /** HR/module-scoped audit history (e.g. for a BGC case or training batch detail tab). */
    public List<ActivityLogResponse> getLogsForEntity(String entityType, Long entityId) {
        return activityLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId).stream()
                .map(this::toResponse)
                .toList();
    }

    private ActivityLogResponse toResponse(ActivityLog log) {
        return ActivityLogResponse.builder()
                .id(log.getId())
                .userId(log.getUser() != null ? log.getUser().getId() : null)
                .userName(log.getUser() != null ? log.getUser().getName() : null)
                .actionType(log.getActionType())
                .description(log.getDescription())
                .entityType(log.getEntityType())
                .entityId(log.getEntityId())
                .timestamp(log.getTimestamp())
                .build();
    }
}
