import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

export interface TraineeRecord {
  traineeId: number;
  userId: number;
  applicationId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  applicationStatus: string;
  progress: number;
  topic?: string;
  completed: boolean;
  joinedAt?: string;
  updatedAt?: string;
}

/**
 * Backend-aligned training/trainee service (real nexHIRE API).
 * Distinct from the legacy mock TrainingService (selected candidates / catalog).
 */
@Injectable({ providedIn: 'root' })
export class TraineeProgressService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** HR: list all trainees. */
  getAllTrainees(): Observable<TraineeRecord[]> {
    return this.http.get<TraineeRecord[]>(API_ENDPOINTS.TRAINEES.BASE);
  }

  /** EMPLOYEE: own training record. */
  getMyTraining(): Observable<TraineeRecord> {
    return this.http.get<TraineeRecord>(API_ENDPOINTS.TRAINEES.MY);
  }

  /** HR: update training progress (0-100). */
  updateProgress(
    traineeId: number,
    progress: number,
    topic?: string,
  ): Observable<TraineeRecord> {
    return this.http.put<TraineeRecord>(
      API_ENDPOINTS.TRAINEES.UPDATE_PROGRESS(traineeId),
      { progress, topic },
    );
  }

  /** HR: mark training complete. */
  complete(traineeId: number): Observable<TraineeRecord> {
    return this.http.put<TraineeRecord>(
      API_ENDPOINTS.TRAINEES.COMPLETE(traineeId),
      {},
    );
  }
}
