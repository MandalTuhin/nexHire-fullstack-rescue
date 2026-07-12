// ─── Training Batch Models (backend aligned) ──────────────────────────────────
// Training Assignment, LAP, and Release — operate on the same JoiningBatch a
// batch already is; see joining-batch.model.ts for the batch fields themselves.

import { JoiningBatch } from './joining-batch.model';

export type TraineeFinalResult = 'PENDING' | 'PASSED' | 'COMPLETED' | 'FAILED' | 'LAP';

export type TrainingProgramStatus = 'ACTIVE' | 'INACTIVE';

export interface TrainingProgram {
  id: number;
  name: string;
  duration?: string;
  costPerCandidate: number;
  cutoffScore: number;
  minimumAttendancePercentage: number;
  status: TrainingProgramStatus;
}

export interface TrainingProgramCreateRequest {
  name: string;
  duration?: string;
  costPerCandidate: number;
  cutoffScore: number;
  minimumAttendancePercentage: number;
}

export interface TrainingProgramUpdateRequest {
  name?: string;
  duration?: string;
  costPerCandidate?: number;
  cutoffScore?: number;
  minimumAttendancePercentage?: number;
  status?: TrainingProgramStatus;
}

export interface AssignTrainingRequest {
  trainingProgramId: number;
}

export interface TraineeDetail {
  traineeId: number;
  applicationId: number;
  userId: number;
  employeeCode?: string;
  selectedUserId?: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  batchId?: number;
  batchCode?: string;
  assessmentScore?: number;
  score?: number;
  attendancePercentage?: number;
  finalResult: TraineeFinalResult;
  lapEnabled: boolean;
  released: boolean;
  flagReason?: string;
  remarks?: string;
  applicationStatus: string;
  joinedAt: string;
}

export interface TrainingBatchDashboard {
  id: number;
  batchCode: string;
  batchName: string;
  joiningDate: string;
  joiningLocationName: string;
  trainingLocationName: string;
  trainingProgram?: string;
  block?: string;
  trainingStartDate?: string;
  trainingEndDate?: string;
  status: string;
  totalCandidates: number;
  passedCount: number;
  failedCount: number;
  lapCount: number;
  releasedCount: number;
  pendingCount: number;
  progressPercent: number;
}

export interface TrainingBatchDetail {
  batch: JoiningBatch;
  assignedTrainingName?: string;
  assignedTrainingCutoffScore?: number;
  assignedTrainingMinAttendance?: number;
  trainees: TraineeDetail[];
}
