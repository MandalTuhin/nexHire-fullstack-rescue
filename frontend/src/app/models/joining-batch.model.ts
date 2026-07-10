// ─── Joining Batch Models (backend aligned) ───────────────────────────────────

export type JoiningBatchStatus =
  | 'CREATED'
  | 'JOINING_LETTER_SENT'
  | 'JOINING_ACCEPTANCE_IN_PROGRESS'
  | 'READY_FOR_TRAINING'
  | 'ASSIGNED_TO_TRAINING'
  | 'TRAINING_IN_PROGRESS'
  | 'COMPLETED'
  | 'COMPLETED_WITH_EXCEPTIONS'
  | 'CLOSED'
  | 'CANCELLED';

export interface EligibleJoiningCandidate {
  applicationId: number;
  userId: number;
  employeeCode: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  assessmentScore?: number;
  locationPreferenceRank?: number;
}

export interface JoiningBatchMember {
  applicationId: number;
  userId: number;
  employeeCode?: string;
  candidateName: string;
  candidateEmail: string;
  locationPreferenceRank?: number;
  applicationStatus: string;
  joiningLetterStatus: 'NOT_GENERATED' | 'GENERATED' | 'SENT';
}

export interface JoiningBatch {
  id: number;
  batchCode: string;
  batchName: string;
  joiningDate: string;
  joiningLocationId: number;
  joiningLocationName: string;
  trainingLocationId: number;
  trainingLocationName: string;
  trainingProgram?: string;
  block?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  batchSize: number;
  currentHeadcount: number;
  status: JoiningBatchStatus;
  createdByName: string;
  createdAt: string;
  members?: JoiningBatchMember[];
}

export interface JoiningBatchCreateRequest {
  batchName?: string;
  joiningDate: string;
  joiningLocationId: number;
  trainingLocationId: number;
  trainingProgram?: string;
  block?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  batchSize: number;
  applicationIds: number[];
}

export interface JoiningBatchAutoCreateRequest {
  batchNamePrefix?: string;
  joiningDate: string;
  joiningLocationId: number;
  trainingLocationId: number;
  trainingProgram?: string;
  block?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  batchSize: number;
}
