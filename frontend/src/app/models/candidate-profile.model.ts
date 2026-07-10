// ─── Candidate Profile Models ─────────────────────────────────────────────────
// Aligned with backend com.nexhire.dto.CandidateProfileRequest / CandidateProfileResponse

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface CandidateProfileRequest {
  dateOfBirth?: string | null;
  gender?: Gender | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;

  tenthSchoolBoard?: string | null;
  tenthPercentage?: number | null;
  tenthPassingYear?: number | null;

  twelfthSchoolBoard?: string | null;
  twelfthPercentage?: number | null;
  twelfthPassingYear?: number | null;

  graduationDegree?: string | null;
  graduationUniversity?: string | null;
  graduationCgpa?: number | null;
  graduationStartYear?: number | null;
  graduationPassingYear?: number | null;

  postGraduationDegree?: string | null;
  postGraduationUniversity?: string | null;
  postGraduationCgpa?: number | null;
  postGraduationPassingYear?: number | null;

  primarySkills?: string | null;
  secondarySkills?: string | null;
  certifications?: string | null;

  /** Exactly 3 unique, non-blank entries when present; index 0 = highest priority. */
  locationPreferences?: string[] | null;
}

export interface CandidateProfileResponse {
  userId: number;

  dateOfBirth?: string;
  gender?: Gender;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;

  tenthSchoolBoard?: string;
  tenthPercentage?: number;
  tenthPassingYear?: number;

  twelfthSchoolBoard?: string;
  twelfthPercentage?: number;
  twelfthPassingYear?: number;

  graduationDegree?: string;
  graduationUniversity?: string;
  graduationCgpa?: number;
  graduationStartYear?: number;
  graduationPassingYear?: number;

  postGraduationDegree?: string;
  postGraduationUniversity?: string;
  postGraduationCgpa?: number;
  postGraduationPassingYear?: number;

  primarySkills?: string;
  secondarySkills?: string;
  certifications?: string;

  resumeFileId?: number;
  resumeFileName?: string;

  locationPreferences: string[];

  profileCompleted: boolean;
  missingFields: string[];
  completedAt?: string;
}
