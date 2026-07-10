package com.nexhire.repository;

import com.nexhire.entity.BulkUploadLog;
import com.nexhire.enums.UploadType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BulkUploadLogRepository extends JpaRepository<BulkUploadLog, Long> {

    List<BulkUploadLog> findByUploadTypeOrderByUploadedAtDesc(UploadType uploadType);

    List<BulkUploadLog> findAllByOrderByUploadedAtDesc();

    List<BulkUploadLog> findByUploadTypeAndRelatedEntityIdOrderByUploadedAtDesc(UploadType uploadType, Long relatedEntityId);
}
