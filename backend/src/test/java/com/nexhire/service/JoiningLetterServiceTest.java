package com.nexhire.service;

import com.nexhire.dto.JoiningLetterResponse;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.LifecycleStatus;
import com.nexhire.enums.UserRole;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.repository.EmployeeRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.JoiningLetterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class JoiningLetterServiceTest {

    @Mock private JoiningLetterRepository joiningLetterRepository;
    @Mock private JobApplicationRepository applicationRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private FileStorageService fileStorageService;
    @Mock private AuditLogService auditLogService;
    @Mock private JoiningBatchService joiningBatchService;

    @InjectMocks
    private JoiningLetterService joiningLetterService;

    private JobApplication application;
    private User candidate;
    private City location;
    private JoiningLetter letter;

    @BeforeEach
    void setUp() {
        location = City.builder().id(1L).name("Bangalore").build();
        candidate = User.builder().id(1L).name("John").email("john@test.com")
                .role(UserRole.EMPLOYEE).lifecycleStatus(LifecycleStatus.CANDIDATE).active(true).build();
        Job job = Job.builder().id(1L).title("Java Dev").description("Desc").location(location).build();
        application = JobApplication.builder().id(1L).user(candidate).job(job)
                .status(ApplicationStatus.JOINING_LETTER_SENT).build();
        letter = JoiningLetter.builder().id(1L).application(application)
                .content("Welcome").joiningDate(LocalDate.now()).location(location).build();
    }

    @Test
    @DisplayName("Accept joining letter from JOINING_LETTER_SENT succeeds, no trainee/budget side effects")
    void acceptJoiningLetter_succeeds() {
        when(joiningLetterRepository.findById(1L)).thenReturn(Optional.of(letter));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(joiningLetterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findByApplicationId(1L)).thenReturn(Optional.empty());

        JoiningLetterResponse response = joiningLetterService.acceptJoiningLetter(1L, 1L);

        assertThat(response.getStatus()).isEqualTo("JOINING_ACCEPTED");
        verify(applicationRepository).save(argThat(a -> a.getStatus() == ApplicationStatus.JOINING_ACCEPTED));
    }

    @Test
    @DisplayName("Accept joining letter from wrong status throws")
    void acceptJoiningLetter_wrongStatus_throws() {
        application.setStatus(ApplicationStatus.OFFER_ACCEPTED);
        when(joiningLetterRepository.findById(1L)).thenReturn(Optional.of(letter));

        assertThatThrownBy(() -> joiningLetterService.acceptJoiningLetter(1L, 1L))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Accept someone else's joining letter throws")
    void acceptJoiningLetter_wrongUser_throws() {
        when(joiningLetterRepository.findById(1L)).thenReturn(Optional.of(letter));

        assertThatThrownBy(() -> joiningLetterService.acceptJoiningLetter(1L, 999L))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Reject joining letter from JOINING_LETTER_SENT succeeds")
    void rejectJoiningLetter_succeeds() {
        when(joiningLetterRepository.findById(1L)).thenReturn(Optional.of(letter));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(joiningLetterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(employeeRepository.findByApplicationId(1L)).thenReturn(Optional.empty());

        JoiningLetterResponse response = joiningLetterService.rejectJoiningLetter(1L, 1L);

        assertThat(response.getStatus()).isEqualTo("JOINING_REJECTED");
    }
}
