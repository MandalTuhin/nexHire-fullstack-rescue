// ─── Admin Models ─────────────────────────────────────────────────────────────

export interface Admin {
  adminId: number;
  fullName: string;
  email: string;
  phone?: string;
  active: boolean;
  createdAt?: string;
}

export interface CreateAdminRequest {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

// ─── Dashboard Stats Model ────────────────────────────────────────────────────

export interface DashboardStats {
  totalApplications: number;
  profileCompletedCandidates: number;

  assessmentAssignedCount: number;
  assessmentScoreUploadedCount: number;
  assessmentPassedCount: number;
  assessmentFailedCount: number;

  offerLettersGenerated: number;
  offerLettersSent: number;
  offerAcceptedCount: number;
  offerRejectedCount: number;

  bgcInitiatedCount: number;
  bgcDocumentsSubmittedCount: number;
  bgcClearedCount: number;
  bgcFailedCount: number;

  employeesCreated: number;
  selectedUsersCreated: number;

  joiningBatchesCreated: number;
  joiningLettersSent: number;
  joiningAcceptedCount: number;

  trainingBatchesAssigned: number;
  lapCandidates: number;
  passedTrainees: number;
  failedTrainees: number;
  releasedCandidates: number;

  projectAllocatedCandidates: number;

  totalVacancyUsed: number;
  totalVacancyAvailable: number;
  totalBudgetUsed: number;
  totalBudgetAvailable: number;
}

export interface PendingActions {
  candidatesEligibleForAssessment: number;
  offersPendingSend: number;
  candidatesPendingBgcDocuments: number;
  candidatesEligibleForBatch: number;
  trainingBatchesRequiringResultUpload: number;
  lapCandidatesRequiringReview: number;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
}
