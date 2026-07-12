package com.nexhire.repository;

import com.nexhire.entity.Project;
import com.nexhire.enums.ProjectStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {

    List<Project> findByStatus(ProjectStatus status);

    long countByStatus(ProjectStatus status);
}
