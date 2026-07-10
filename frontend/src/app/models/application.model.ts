// ─── Application Models ───────────────────────────────────────────────────────

// Aligned with backend com.nexhire.enums.ApplicationStatus
export type ApplicationStatus =
  | 'APPLIED'
  | 'ASSESSMENT_ASSIGNED'
  | 'ASSESSMENT_SCORE_UPLOADED'
  | 'ASSESSMENT_PASSED'
  | 'ASSESSMENT_FAILED'
  | 'OFFER_GENERATED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'BGC_INITIATED'
  | 'BGC_DOCUMENTS_PENDING'
  | 'BGC_DOCUMENTS_SUBMITTED'
  | 'BGC_VERIFICATION_IN_PROGRESS'
  | 'BGC_CLEARED'
  | 'BGC_FAILED'
  | 'EMPLOYEE_CREATED'
  | 'SELECTED_USER_CREATED'
  | 'JOINING_BATCH_ASSIGNED'
  | 'JOINING_LETTER_GENERATED'
  | 'JOINING_LETTER_SENT'
  | 'JOINING_ON_HOLD'
  | 'JOINING_ACCEPTED'
  | 'JOINING_REJECTED'
  | 'TRAINING_ASSIGNED'
  | 'TRAINING_IN_PROGRESS'
  | 'TRAINING_RESULT_UPLOADED'
  | 'TRAINING_COMPLETED'
  | 'LAP'
  | 'COMPLETED_WITH_EXCEPTIONS'
  | 'RELEASED'
  | 'PROJECT_ASSIGNED'
  | 'ONBOARDED';

export interface Application {
  applicationId: number;
  userId: number;
  jobId: number;
  // Populated joins
  userFullName?: string;
  userEmail?: string;
  userPhone?: string;
  userResumeUrl?: string;
  coverLetter?: string;
  jobTitle?: string;
  jobLocation?: string;
  status: ApplicationStatus;
  appliedDate: string;
  updatedAt?: string;
  remarks?: string;
  // Hold info (backend JOINING_ON_HOLD edge case)
  holdReason?: string;
  holdCreatedAt?: string;
  holdResolvedAt?: string;
  // Assessment info (if exists)
  assessmentId?: number;
  assessmentStatus?: string;
  // Offer info (if exists)
  offerId?: number;
  offerStatus?: string;
  // BGV info (if exists)
  bgvStatus?: string;
  // Candidate's graduation passing year, if their profile has one.
  passoutYear?: number;
}

export interface ApplyRequest {
  jobId: number;
  userId: number;
  coverLetter?: string;
  resumeUrl?: string;
}

export interface UpdateApplicationStatusRequest {
  status: ApplicationStatus;
  remarks?: string;
}

export interface ApplicationFilter {
  jobId?: number;
  status?: ApplicationStatus;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  size?: number;
}

// Aligned with backend com.nexhire.enums.SmartFilter
export type SmartFilter =
  | 'ELIGIBLE_FOR_ASSESSMENT'
  | 'ASSESSMENT_ASSIGNED'
  | 'ASSESSMENT_PASSED'
  | 'ELIGIBLE_FOR_OFFER'
  | 'OFFER_ACCEPTED'
  | 'ELIGIBLE_FOR_BGC'
  | 'BGC_CLEARED'
  | 'ELIGIBLE_FOR_BATCH';

/** Aligned with backend com.nexhire.dto.ApplicationFilterRequest — the wire
 *  contract for POST /api/applications/search and /export. */
export interface ApplicationFilterRequest {
  search?: string;
  applicationId?: number;
  statuses?: ApplicationStatus[];
  profileCompleted?: boolean;
  locationPreference?: string;
  qualification?: string;
  scoreMin?: number;
  scoreMax?: number;
  bgcStatus?: string;
  smartFilter?: SmartFilter;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

/** Aligned with backend com.nexhire.dto.BulkActionResult. */
export interface ApplicationBulkActionResult {
  totalRequested: number;
  successCount: number;
  failureCount: number;
  failures: { id: number; reason: string }[];
}
