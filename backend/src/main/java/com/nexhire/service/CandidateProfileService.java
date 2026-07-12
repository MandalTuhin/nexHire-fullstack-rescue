package com.nexhire.service;

import com.nexhire.dto.CandidateProfileRequest;
import com.nexhire.dto.CandidateProfileResponse;
import com.nexhire.entity.CandidateLocationPreference;
import com.nexhire.entity.CandidateProfile;
import com.nexhire.entity.User;
import com.nexhire.enums.FileCategory;
import com.nexhire.enums.Gender;
import com.nexhire.exception.BusinessRuleException;
import com.nexhire.exception.ResourceNotFoundException;
import com.nexhire.repository.CandidateLocationPreferenceRepository;
import com.nexhire.repository.CandidateProfileRepository;
import com.nexhire.repository.StoredFileRepository;
import com.nexhire.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CandidateProfileService {

    private final CandidateProfileRepository profileRepository;
    private final CandidateLocationPreferenceRepository locationPreferenceRepository;
    private final UserRepository userRepository;
    private final StoredFileRepository storedFileRepository;
    private final FileStorageService fileStorageService;

    @Transactional(readOnly = true)
    public CandidateProfileResponse getProfile(Long userId) {
        CandidateProfile profile = profileRepository.findByUserId(userId).orElse(null);
        List<CandidateLocationPreference> prefs = locationPreferenceRepository.findByUserIdOrderByPreferenceRankAsc(userId);
        return toResponse(userId, profile, prefs);
    }

    @Transactional
    public CandidateProfileResponse updateProfile(Long userId, CandidateProfileRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        CandidateProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> CandidateProfile.builder().user(user).build());

        profile.setDateOfBirth(request.getDateOfBirth());
        profile.setGender(parseGender(request.getGender()));
        profile.setAddressLine(request.getAddressLine());
        profile.setCity(request.getCity());
        profile.setState(request.getState());
        profile.setPincode(request.getPincode());

        profile.setTenthSchoolBoard(request.getTenthSchoolBoard());
        profile.setTenthPercentage(request.getTenthPercentage());
        profile.setTenthPassingYear(request.getTenthPassingYear());

        profile.setTwelfthSchoolBoard(request.getTwelfthSchoolBoard());
        profile.setTwelfthPercentage(request.getTwelfthPercentage());
        profile.setTwelfthPassingYear(request.getTwelfthPassingYear());

        profile.setGraduationDegree(request.getGraduationDegree());
        profile.setGraduationUniversity(request.getGraduationUniversity());
        profile.setGraduationCgpa(request.getGraduationCgpa());
        profile.setGraduationStartYear(request.getGraduationStartYear());
        profile.setGraduationPassingYear(request.getGraduationPassingYear());

        profile.setPostGraduationDegree(request.getPostGraduationDegree());
        profile.setPostGraduationUniversity(request.getPostGraduationUniversity());
        profile.setPostGraduationCgpa(request.getPostGraduationCgpa());
        profile.setPostGraduationPassingYear(request.getPostGraduationPassingYear());

        profile.setPrimarySkills(request.getPrimarySkills());
        profile.setSecondarySkills(request.getSecondarySkills());
        profile.setCertifications(request.getCertifications());

        if (request.getLocationPreferences() != null) {
            saveLocationPreferences(user, request.getLocationPreferences());
        }

        CandidateProfile saved = applyCompleteness(profile);
        List<CandidateLocationPreference> prefs = locationPreferenceRepository.findByUserIdOrderByPreferenceRankAsc(userId);
        return toResponse(userId, saved, prefs);
    }

    @Transactional
    public CandidateProfileResponse uploadResume(Long userId, MultipartFile file) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Long storedFileId = fileStorageService.store(file, FileCategory.RESUME, userId);

        CandidateProfile profile = profileRepository.findByUserId(userId)
                .orElseGet(() -> CandidateProfile.builder().user(user).build());
        profile.setResumeFile(storedFileRepository.getReferenceById(storedFileId));

        CandidateProfile saved = applyCompleteness(profile);
        List<CandidateLocationPreference> prefs = locationPreferenceRepository.findByUserIdOrderByPreferenceRankAsc(userId);
        return toResponse(userId, saved, prefs);
    }

    public FileStorageService.StoredFileData downloadResume(Long userId) {
        CandidateProfile profile = profileRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile not found"));
        if (profile.getResumeFile() == null) {
            throw new ResourceNotFoundException("No resume uploaded yet");
        }
        return fileStorageService.retrieve(profile.getResumeFile().getId());
    }

    /** Used by ApplicationService to gate job applications. */
    public boolean isProfileComplete(Long userId) {
        return profileRepository.findByUserId(userId)
                .map(CandidateProfile::getProfileCompleted)
                .orElse(false);
    }

    private void saveLocationPreferences(User user, List<String> rawPreferences) {
        List<String> cleaned = rawPreferences.stream()
                .filter(s -> s != null && !s.isBlank())
                .map(String::trim)
                .toList();

        if (cleaned.isEmpty()) {
            locationPreferenceRepository.deleteByUserId(user.getId());
            return;
        }

        if (cleaned.size() != 3) {
            throw new BusinessRuleException("Exactly three location preferences are required");
        }
        Set<String> uniqueCheck = new LinkedHashSet<>();
        for (String pref : cleaned) {
            if (!uniqueCheck.add(pref.toLowerCase())) {
                throw new BusinessRuleException("Location preferences must be unique: duplicate '" + pref + "'");
            }
        }

        // Flush the delete before inserting the replacement rows. CandidateLocationPreference
        // has unique constraints on (user_id, preference_rank) and (user_id, location_name);
        // without an explicit flush here, Hibernate queues both the delete and the inserts in
        // the same flush and runs inserts before deletes, so re-saving the SAME preferences
        // (the common case — every resave after the first) trips the unique constraint and
        // 500s. Flushing forces the delete to hit the DB first.
        locationPreferenceRepository.deleteByUserId(user.getId());
        locationPreferenceRepository.flush();

        List<CandidateLocationPreference> entities = new ArrayList<>();
        for (int i = 0; i < cleaned.size(); i++) {
            entities.add(CandidateLocationPreference.builder()
                    .user(user)
                    .preferenceRank(i + 1)
                    .locationName(cleaned.get(i))
                    .build());
        }
        locationPreferenceRepository.saveAll(entities);
    }

    private CandidateProfile applyCompleteness(CandidateProfile profile) {
        List<CandidateLocationPreference> prefs =
                locationPreferenceRepository.findByUserIdOrderByPreferenceRankAsc(profile.getUser().getId());
        List<String> missing = computeMissingFields(profile, prefs);
        boolean complete = missing.isEmpty();
        profile.setProfileCompleted(complete);
        profile.setCompletedAt(complete ? (profile.getCompletedAt() != null ? profile.getCompletedAt() : LocalDateTime.now()) : null);
        return profileRepository.save(profile);
    }

    private List<String> computeMissingFields(CandidateProfile p, List<CandidateLocationPreference> prefs) {
        List<String> missing = new ArrayList<>();
        if (p.getDateOfBirth() == null) missing.add("Date of Birth");
        if (p.getGender() == null) missing.add("Gender");
        if (isBlank(p.getAddressLine())) missing.add("Address");
        if (isBlank(p.getCity())) missing.add("City");
        if (isBlank(p.getState())) missing.add("State");
        if (isBlank(p.getPincode())) missing.add("Pincode");

        if (isBlank(p.getTenthSchoolBoard()) || p.getTenthPercentage() == null || p.getTenthPassingYear() == null) {
            missing.add("10th Details");
        }
        if (isBlank(p.getTwelfthSchoolBoard()) || p.getTwelfthPercentage() == null || p.getTwelfthPassingYear() == null) {
            missing.add("12th Details");
        }
        if (isBlank(p.getGraduationDegree()) || isBlank(p.getGraduationUniversity())
                || p.getGraduationCgpa() == null || p.getGraduationStartYear() == null
                || p.getGraduationPassingYear() == null) {
            missing.add("Graduation Details");
        }

        if (isBlank(p.getPrimarySkills())) missing.add("Primary Skills");
        if (p.getResumeFile() == null) missing.add("Resume");
        if (prefs == null || prefs.size() != 3) missing.add("Location Preferences (3 required)");

        return missing;
    }

    private boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private Gender parseGender(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return Gender.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessRuleException("Invalid gender value: " + value);
        }
    }

    private CandidateProfileResponse toResponse(Long userId, CandidateProfile profile, List<CandidateLocationPreference> prefs) {
        List<String> prefNames = prefs.stream().map(CandidateLocationPreference::getLocationName).toList();

        if (profile == null) {
            return CandidateProfileResponse.builder()
                    .userId(userId)
                    .locationPreferences(prefNames)
                    .profileCompleted(false)
                    .missingFields(computeMissingFields(CandidateProfile.builder().build(), prefs))
                    .build();
        }

        return CandidateProfileResponse.builder()
                .userId(userId)
                .dateOfBirth(profile.getDateOfBirth())
                .gender(profile.getGender() != null ? profile.getGender().name() : null)
                .addressLine(profile.getAddressLine())
                .city(profile.getCity())
                .state(profile.getState())
                .pincode(profile.getPincode())
                .tenthSchoolBoard(profile.getTenthSchoolBoard())
                .tenthPercentage(profile.getTenthPercentage())
                .tenthPassingYear(profile.getTenthPassingYear())
                .twelfthSchoolBoard(profile.getTwelfthSchoolBoard())
                .twelfthPercentage(profile.getTwelfthPercentage())
                .twelfthPassingYear(profile.getTwelfthPassingYear())
                .graduationDegree(profile.getGraduationDegree())
                .graduationUniversity(profile.getGraduationUniversity())
                .graduationCgpa(profile.getGraduationCgpa())
                .graduationStartYear(profile.getGraduationStartYear())
                .graduationPassingYear(profile.getGraduationPassingYear())
                .postGraduationDegree(profile.getPostGraduationDegree())
                .postGraduationUniversity(profile.getPostGraduationUniversity())
                .postGraduationCgpa(profile.getPostGraduationCgpa())
                .postGraduationPassingYear(profile.getPostGraduationPassingYear())
                .primarySkills(profile.getPrimarySkills())
                .secondarySkills(profile.getSecondarySkills())
                .certifications(profile.getCertifications())
                .resumeFileId(profile.getResumeFile() != null ? profile.getResumeFile().getId() : null)
                .resumeFileName(profile.getResumeFile() != null ? profile.getResumeFile().getFileName() : null)
                .locationPreferences(prefNames)
                .profileCompleted(profile.getProfileCompleted())
                .missingFields(computeMissingFields(profile, prefs))
                .completedAt(profile.getCompletedAt())
                .build();
    }
}
