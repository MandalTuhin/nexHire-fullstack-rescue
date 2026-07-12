package com.nexhire.service;

import com.nexhire.dto.BulkActionResult;
import com.nexhire.dto.ProjectAssignmentResponse;
import com.nexhire.dto.ProjectRequest;
import com.nexhire.dto.ProjectResponse;
import com.nexhire.dto.TraineeResponse;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.LifecycleStatus;
import com.nexhire.enums.ProjectStatus;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.DuplicateResourceException;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;
    private final TraineeRepository traineeRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserRepository userRepository;
    private final CityRepository cityRepository;
    private final NotificationService notificationService;

    /** ADMIN + RMG: list all projects (RMG filters to active ones client-side for allocation). */
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll().stream().map(this::toProjectResponse).toList();
    }

    /** ADMIN: create a project. */
    @Transactional
    public ProjectResponse createProject(ProjectRequest request) {
        Project project = Project.builder()
                .name(request.getName())
                .description(request.getDescription())
                .client(request.getClient())
                .technology(request.getTechnology())
                .location(resolveLocation(request.getLocationId()))
                .totalVacancies(request.getTotalVacancies() != null ? request.getTotalVacancies() : 0)
                .build();
        project.recomputeStatus();
        return toProjectResponse(projectRepository.save(project));
    }

    /** ADMIN: update an existing project's details. */
    @Transactional
    public ProjectResponse updateProject(Long projectId, ProjectRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        if (request.getClient() != null) project.setClient(request.getClient());
        if (request.getTechnology() != null) project.setTechnology(request.getTechnology());
        if (request.getLocationId() != null) project.setLocation(resolveLocation(request.getLocationId()));
        if (request.getTotalVacancies() != null) project.setTotalVacancies(request.getTotalVacancies());

        if (request.getStatus() != null) {
            try {
                project.setStatus(ProjectStatus.valueOf(request.getStatus().trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                throw new BusinessRuleException("Invalid project status: " + request.getStatus());
            }
        }
        // Re-derive ACTIVE/FILLED against the (possibly just-changed) vacancy count — a manual
        // INACTIVE set above is preserved since recomputeStatus() never overrides it.
        project.recomputeStatus();

        return toProjectResponse(projectRepository.save(project));
    }

    private City resolveLocation(Long locationId) {
        if (locationId == null) return null;
        return cityRepository.findById(locationId)
                .orElseThrow(() -> new ResourceNotFoundException("City not found with id: " + locationId));
    }

    /** ADMIN: delete a project. Blocked while trainees are still assigned to it. */
    @Transactional
    public void deleteProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));
        if (projectAssignmentRepository.existsByProjectId(projectId)) {
            throw new InvalidStateTransitionException(
                    "Cannot delete a project that still has trainees assigned to it");
        }
        projectRepository.delete(project);
    }

    /** RMG: trainees eligible for assignment (applicationStatus == RELEASED, per the batch
     *  release logic in TrainingBatchService — was TRAINING_COMPLETED before the batch-wise
     *  LAP/release pipeline existed). */
    public List<TraineeResponse> getEligibleTrainees() {
        return traineeRepository.findByApplicationStatus(ApplicationStatus.RELEASED)
                .stream().map(this::toTraineeResponse).toList();
    }

    /** RMG: bulk-assign multiple released trainees to a single project (multi-select allocation,
     *  P-Claude.md section 8). Each trainee is validated/assigned independently — one failure
     *  (e.g. vacancies run out partway through) doesn't roll back the ones that already
     *  succeeded, mirroring the pattern used by OfferService.bulkSend. */
    @Transactional
    public BulkActionResult bulkAssign(Long projectId, List<Long> traineeIds, Long assignedById) {
        int success = 0;
        java.util.List<BulkActionResult.Failure> failures = new java.util.ArrayList<>();
        for (Long traineeId : traineeIds) {
            try {
                assignTrainee(projectId, traineeId, assignedById);
                success++;
            } catch (Exception e) {
                failures.add(BulkActionResult.Failure.builder().id(traineeId).reason(e.getMessage()).build());
            }
        }
        return BulkActionResult.builder()
                .totalRequested(traineeIds.size())
                .successCount(success)
                .failureCount(failures.size())
                .failures(failures)
                .build();
    }

    /**
     * RMG: assign a released trainee to a project.
     * Sets applicationStatus + lifecycleStatus to PROJECT_ASSIGNED.
     */
    @Transactional
    public ProjectAssignmentResponse assignTrainee(Long projectId, Long traineeId, Long assignedById) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        Trainee trainee = traineeRepository.findById(traineeId)
                .orElseThrow(() -> new ResourceNotFoundException("Trainee not found with id: " + traineeId));

        JobApplication application = trainee.getApplication();
        if (application.getStatus() != ApplicationStatus.RELEASED) {
            throw new InvalidStateTransitionException(
                    "Cannot assign: trainee applicationStatus must be RELEASED, current is " + application.getStatus());
        }

        if (projectAssignmentRepository.findByTraineeId(traineeId).isPresent()) {
            throw new DuplicateResourceException("Trainee already assigned to a project");
        }

        // P-Claude.md section 8: "Always validate remaining vacancies. Never allow allocation
        // beyond project capacity." totalVacancies == 0 means "no cap configured" (legacy/open
        // projects), so only enforce when a real cap has been set.
        if (project.getTotalVacancies() != null && project.getTotalVacancies() > 0
                && project.getAllocatedCount() >= project.getTotalVacancies()) {
            throw new BusinessRuleException(
                    "Project '" + project.getName() + "' has no remaining vacancies (" +
                            project.getAllocatedCount() + "/" + project.getTotalVacancies() + " filled)");
        }

        User assignedBy = userRepository.findById(assignedById)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ProjectAssignment assignment = ProjectAssignment.builder()
                .trainee(trainee)
                .project(project)
                .assignedBy(assignedBy)
                .assignedAt(LocalDateTime.now())
                .build();
        projectAssignmentRepository.save(assignment);

        // Update statuses
        application.setStatus(ApplicationStatus.PROJECT_ASSIGNED);
        applicationRepository.save(application);

        User user = trainee.getUser();
        user.setLifecycleStatus(LifecycleStatus.PROJECT_ASSIGNED);
        userRepository.save(user);

        // Increment allocated count and auto-flip to FILLED if this was the last vacancy.
        project.setAllocatedCount(project.getAllocatedCount() + 1);
        project.recomputeStatus();
        projectRepository.save(project);

        // Notify trainee about project assignment
        notificationService.notify(user.getId(), "PROJECT_ASSIGNED",
                "Project Assigned",
                "You have been assigned to project: " + project.getName() + ". Welcome to the team!");

        return toAssignmentResponse(assignment);
    }

    /** EMPLOYEE: the logged-in candidate's own project assignment, if any (P-Claude.md section 8:
     *  "Candidate Portal should display Project Name, Technology, Location, Allocation Date,
     *  Current Project Status"). Null (no content) until RMG has assigned them. */
    public ProjectAssignmentResponse getMyProject(Long userId) {
        return projectAssignmentRepository.findByTraineeUserId(userId)
                .map(this::toAssignmentResponse)
                .orElse(null);
    }

    private ProjectAssignmentResponse toAssignmentResponse(ProjectAssignment assignment) {
        Project project = assignment.getProject();
        User user = assignment.getTrainee().getUser();
        return ProjectAssignmentResponse.builder()
                .id(assignment.getId())
                .traineeId(assignment.getTrainee().getId())
                .projectId(project.getId())
                .projectName(project.getName())
                .technology(project.getTechnology())
                .locationName(project.getLocation() != null ? project.getLocation().getName() : null)
                .projectStatus(project.getStatus().name())
                .candidateName(user.getName())
                .candidateEmail(user.getEmail())
                .assignedByName(assignment.getAssignedBy() != null ? assignment.getAssignedBy().getName() : null)
                .assignedAt(assignment.getAssignedAt())
                .build();
    }

    private ProjectResponse toProjectResponse(Project p) {
        int remaining = p.getTotalVacancies() != null
                ? Math.max(0, p.getTotalVacancies() - p.getAllocatedCount())
                : 0;
        return ProjectResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .description(p.getDescription())
                .client(p.getClient())
                .technology(p.getTechnology())
                .locationId(p.getLocation() != null ? p.getLocation().getId() : null)
                .locationName(p.getLocation() != null ? p.getLocation().getName() : null)
                .totalVacancies(p.getTotalVacancies())
                .allocatedCount(p.getAllocatedCount())
                .remainingVacancies(remaining)
                .status(p.getStatus().name())
                .createdAt(p.getCreatedAt())
                .build();
    }

    private TraineeResponse toTraineeResponse(Trainee trainee) {
        JobApplication app = trainee.getApplication();
        return TraineeResponse.builder()
                .traineeId(trainee.getId())
                .userId(trainee.getUser().getId())
                .applicationId(app.getId())
                .candidateName(trainee.getUser().getName())
                .candidateEmail(trainee.getUser().getEmail())
                .jobTitle(app.getJob().getTitle())
                .applicationStatus(app.getStatus().name())
                .score(trainee.getScore())
                .attendancePercentage(trainee.getAttendancePercentage())
                .finalResult(trainee.getFinalResult().name())
                .joinedAt(trainee.getJoinedAt())
                .build();
    }
}
