package com.nexhire.repository;

import com.nexhire.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long> {

    Optional<Employee> findByApplicationId(Long applicationId);

    boolean existsByApplicationId(Long applicationId);
}
