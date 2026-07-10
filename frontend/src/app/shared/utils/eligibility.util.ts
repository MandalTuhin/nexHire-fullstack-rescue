import { CandidateProfileResponse } from '../../models/candidate-profile.model';

/** Minimum 10th/12th percentage and graduation CGPA (direct 10-point mapping — CGPA 6.0
 *  is treated as the equivalent of 60%) required to apply for a hiring drive. */
export const ELIGIBILITY_PERCENT_MIN = 60;
export const ELIGIBILITY_CGPA_MIN = 6.0;

export function isEligibleToApply(profile: CandidateProfileResponse | null | undefined): boolean {
  if (!profile) return false;
  return (
    (profile.tenthPercentage ?? 0) >= ELIGIBILITY_PERCENT_MIN &&
    (profile.twelfthPercentage ?? 0) >= ELIGIBILITY_PERCENT_MIN &&
    (profile.graduationCgpa ?? 0) >= ELIGIBILITY_CGPA_MIN
  );
}

/** Human-readable reason shown next to a disabled Apply button. */
export function eligibilityReason(profile: CandidateProfileResponse | null | undefined): string {
  if (!profile) return 'Complete your profile to check eligibility.';
  const gaps: string[] = [];
  if ((profile.tenthPercentage ?? 0) < ELIGIBILITY_PERCENT_MIN) gaps.push('10th');
  if ((profile.twelfthPercentage ?? 0) < ELIGIBILITY_PERCENT_MIN) gaps.push('12th');
  if ((profile.graduationCgpa ?? 0) < ELIGIBILITY_CGPA_MIN) gaps.push('Graduation');
  if (gaps.length === 0) return '';
  return `You need at least 60% in ${gaps.join(', ')} to apply for this drive.`;
}
