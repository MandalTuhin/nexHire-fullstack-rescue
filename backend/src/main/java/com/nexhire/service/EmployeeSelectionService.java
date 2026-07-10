package com.nexhire.service;

import com.nexhire.dto.SelectedUserResponse;
import com.nexhire.entity.Employee;
import com.nexhire.entity.JobApplication;
import com.nexhire.entity.SelectedUser;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.repository.EmployeeRepository;
import com.nexhire.repository.SelectedUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * context.md "EMPLOYEE AND SELECTED_USER CREATION RULE": the instant BGC clears, an Employee
 * AND a SelectedUser (carrying the employeeId) must be created transactionally, before
 * training — never delayed, never duplicated. Called from every path that can clear a BGC
 * case (individual HR status update, BGC Excel bulk upload).
 */
@Service
@RequiredArgsConstructor
public class EmployeeSelectionService {

    private final EmployeeRepository employeeRepository;
    private final SelectedUserRepository selectedUserRepository;

    @Transactional
    public void createIfAbsent(JobApplication application) {
        Employee employee = employeeRepository.findByApplicationId(application.getId())
                .orElse(null);

        if (employee == null) {
            employee = employeeRepository.save(Employee.builder()
                    .user(application.getUser())
                    .application(application)
                    .employeeCode("PENDING")
                    .build());
            employee.setEmployeeCode(generateEmployeeCode(employee.getId()));
            employee = employeeRepository.save(employee);
        }

        application.setStatus(ApplicationStatus.EMPLOYEE_CREATED);

        if (!selectedUserRepository.existsByApplicationId(application.getId())) {
            selectedUserRepository.save(SelectedUser.builder()
                    .employee(employee)
                    .application(application)
                    .build());
        }

        application.setStatus(ApplicationStatus.SELECTED_USER_CREATED);
    }

    /** HR: all selected users (candidates ready for/in training), for Phase 5/6 batch tooling. */
    public List<SelectedUserResponse> getAllSelected() {
        return selectedUserRepository.findAll().stream().map(this::toResponse).toList();
    }

    private SelectedUserResponse toResponse(SelectedUser su) {
        JobApplication app = su.getApplication();
        return SelectedUserResponse.builder()
                .selectedUserId(su.getId())
                .applicationId(app.getId())
                .userId(app.getUser().getId())
                .employeeCode(su.getEmployee().getEmployeeCode())
                .candidateName(app.getUser().getName())
                .candidateEmail(app.getUser().getEmail())
                .jobTitle(app.getJob().getTitle())
                .status(su.getStatus().name())
                .createdAt(su.getCreatedAt())
                .build();
    }

    private String generateEmployeeCode(Long id) {
        return "EMP" + String.format("%06d", id);
    }
}
