import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';
import { SUPPRESS_404_TOAST } from '../core/interceptors/error-context';

export interface LapHistoryEntry {
  id: number;
  action: string;
  remarks?: string;
  actingUserName?: string;
  createdAt: string;
}

/** Matches backend TraineeDetailResponse — used both by TrainingBatchController's candidate
 *  self-service endpoint (all fields populated) and ProjectService's leaner TraineeResponse for
 *  the RMG eligible-trainees list (batch/employee/lap detail fields simply absent there). */
export interface TraineeRecord {
  traineeId: number;
  userId: number;
  applicationId: number;
  employeeCode?: string;
  selectedUserId?: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  batchId?: number;
  batchCode?: string;
  assessmentScore?: number;
  score?: number;
  attendancePercentage?: number;
  finalResult?: string;
  lapEnabled?: boolean;
  released?: boolean;
  flagReason?: string;
  remarks?: string;
  applicationStatus: string;
  joinedAt?: string;
  lapHistory?: LapHistoryEntry[];
}

/**
 * Backend-aligned training/trainee service (real nexHIRE API — the JoiningBatch+Trainee
 * pipeline). Distinct from the legacy mock TrainingService (selected candidates / catalog).
 */
@Injectable({ providedIn: 'root' })
export class TraineeProgressService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** EMPLOYEE: own trainee record. 404s until the candidate reaches training — an expected
   *  empty state, not an error, so the global 404 toast is suppressed for this call. */
  getMyTraining(): Observable<TraineeRecord> {
    return this.http.get<TraineeRecord>(API_ENDPOINTS.TRAINEES.MY, {
      context: new HttpContext().set(SUPPRESS_404_TOAST, true),
    });
  }
}
