package com.nexhire.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationFilterRequest {

    /** Matches candidate name / email / phone (contains, case-insensitive). */
    private String search;

    /** Exact application id lookup, used together with or instead of search. */
    private Long applicationId;

    private List<String> statuses;

    private Boolean profileCompleted;

    /** Matches any of the candidate's 3 ranked location preferences (case-insensitive exact). */
    private String locationPreference;

    /** Loose proxy for "qualification" filter (matches CandidateProfile.graduationDegree, contains). */
    private String qualification;

    private Double scoreMin;
    private Double scoreMax;

    private String bgcStatus;

    /** One of SmartFilter enum names; when set, overrides/augments statuses & bgcStatus. */
    private String smartFilter;

    @Builder.Default
    private String sortBy = "appliedAt";

    @Builder.Default
    private String sortDir = "desc";

    @Builder.Default
    private int page = 0;

    @Builder.Default
    private int size = 20;
}
