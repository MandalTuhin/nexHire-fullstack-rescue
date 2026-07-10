package com.nexhire.service;

import com.nexhire.dto.OfferRequest;
import com.nexhire.dto.OfferResponse;
import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.UserRole;
import com.nexhire.exception.InvalidStateTransitionException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.AssessmentResultRepository;
import com.nexhire.repository.JobApplicationRepository;
import com.nexhire.repository.OfferLetterRepository;
import com.nexhire.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OfferServiceTest {

    @Mock
    private OfferLetterRepository offerLetterRepository;
    @Mock
    private JobApplicationRepository applicationRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private AssessmentResultRepository assessmentResultRepository;
    @Mock
    private FileStorageService fileStorageService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private BgvService bgvService;

    @InjectMocks
    private OfferService offerService;

    private JobApplication application;
    private OfferLetter offer;
    private User hrUser;
    private User candidate;

    @BeforeEach
    void setUp() {
        Location location = Location.builder().id(1L).name("Bangalore").city("Bangalore").build();
        candidate = User.builder().id(1L).name("John").email("john@test.com").build();
        Job job = Job.builder().id(1L).title("Java Dev").description("Desc").location(location).build();
        application = JobApplication.builder().id(1L).user(candidate).job(job)
                .status(ApplicationStatus.OFFER_GENERATED).build();
        offer = OfferLetter.builder().id(1L).application(application)
                .content("Auto-generated offer").build();
        hrUser = User.builder().id(2L).name("HR").email("hr@test.com").role(UserRole.HR).build();
    }

    @Test
    @DisplayName("Send offer from OFFER_GENERATED succeeds")
    void sendOffer_fromGenerated_succeeds() {
        OfferRequest request = OfferRequest.builder().build();
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(offerLetterRepository.findByApplicationId(1L)).thenReturn(Optional.of(offer));
        when(userRepository.findById(2L)).thenReturn(Optional.of(hrUser));
        when(assessmentResultRepository.findByApplicationId(anyLong())).thenReturn(Optional.empty());
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(offerLetterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        OfferResponse response = offerService.sendOffer(1L, request, 2L);

        assertThat(response.getStatus()).isEqualTo("OFFER_SENT");
    }

    @Test
    @DisplayName("Send offer with no auto-generated offer throws")
    void sendOffer_missingOffer_throws() {
        OfferRequest request = OfferRequest.builder().build();
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(offerLetterRepository.findByApplicationId(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> offerService.sendOffer(1L, request, 2L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Send offer from wrong status throws exception")
    void sendOffer_fromWrongStatus_throws() {
        application.setStatus(ApplicationStatus.APPLIED);
        OfferRequest request = OfferRequest.builder().build();
        when(applicationRepository.findById(1L)).thenReturn(Optional.of(application));
        when(offerLetterRepository.findByApplicationId(1L)).thenReturn(Optional.of(offer));

        assertThatThrownBy(() -> offerService.sendOffer(1L, request, 2L))
                .isInstanceOf(InvalidStateTransitionException.class);
    }

    @Test
    @DisplayName("Accept offer transitions to OFFER_ACCEPTED")
    void acceptOffer_succeeds() {
        application.setStatus(ApplicationStatus.OFFER_SENT);
        offer.setSentBy(hrUser);
        offer.setSentAt(LocalDateTime.now());

        when(offerLetterRepository.findById(1L)).thenReturn(Optional.of(offer));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(offerLetterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assessmentResultRepository.findByApplicationId(anyLong())).thenReturn(Optional.empty());

        OfferResponse response = offerService.acceptOffer(1L, 1L);

        assertThat(response.getStatus()).isEqualTo("OFFER_ACCEPTED");
    }

    @Test
    @DisplayName("Reject offer transitions to OFFER_REJECTED")
    void rejectOffer_succeeds() {
        application.setStatus(ApplicationStatus.OFFER_SENT);
        offer.setSentBy(hrUser);
        offer.setSentAt(LocalDateTime.now());

        when(offerLetterRepository.findById(1L)).thenReturn(Optional.of(offer));
        when(applicationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(offerLetterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(assessmentResultRepository.findByApplicationId(anyLong())).thenReturn(Optional.empty());

        OfferResponse response = offerService.rejectOffer(1L, 1L);

        assertThat(response.getStatus()).isEqualTo("OFFER_REJECTED");
    }
}
