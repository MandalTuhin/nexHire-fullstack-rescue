import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AssignTrainingRequest,
  TraineeBulkActionResult,
  TraineeDetail,
  TrainingBatchDashboard,
  TrainingBatchDetail,
  TrainingProgram,
  TrainingProgramCreateRequest,
  TrainingProgramUpdateRequest,
} from '../models/training-batch.model';
import { UploadSummary } from '../models/bulk-upload.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class TrainingBatchService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getPrograms(): Observable<TrainingProgram[]> {
    return this.http.get<TrainingProgram[]>(API_ENDPOINTS.TRAINING_BATCHES.PROGRAMS);
  }

  createProgram(request: TrainingProgramCreateRequest): Observable<TrainingProgram> {
    return this.http.post<TrainingProgram>(API_ENDPOINTS.TRAINING_BATCHES.PROGRAMS, request);
  }

  updateProgram(id: number, request: TrainingProgramUpdateRequest): Observable<TrainingProgram> {
    return this.http.put<TrainingProgram>(`${API_ENDPOINTS.TRAINING_BATCHES.PROGRAMS}/${id}`, request);
  }

  getDashboard(): Observable<TrainingBatchDashboard[]> {
    return this.http.get<TrainingBatchDashboard[]>(API_ENDPOINTS.TRAINING_BATCHES.BASE);
  }

  getDetail(id: number): Observable<TrainingBatchDetail> {
    return this.http.get<TrainingBatchDetail>(API_ENDPOINTS.TRAINING_BATCHES.BY_ID(id));
  }

  assignTraining(id: number, request: AssignTrainingRequest): Observable<TrainingBatchDetail> {
    return this.http.post<TrainingBatchDetail>(API_ENDPOINTS.TRAINING_BATCHES.ASSIGN_TRAINING(id), request);
  }

  completeBatch(id: number): Observable<TrainingBatchDetail> {
    return this.http.post<TrainingBatchDetail>(API_ENDPOINTS.TRAINING_BATCHES.COMPLETE(id), {});
  }

  moveToLap(traineeId: number, remarks?: string): Observable<TraineeDetail> {
    return this.http.post<TraineeDetail>(API_ENDPOINTS.TRAINING_BATCHES.MOVE_TO_LAP(traineeId), { remarks });
  }

  removeFromLap(traineeId: number): Observable<TraineeDetail> {
    return this.http.post<TraineeDetail>(API_ENDPOINTS.TRAINING_BATCHES.REMOVE_FROM_LAP(traineeId), {});
  }

  bulkMoveToLap(traineeIds: number[], remarks?: string): Observable<TraineeBulkActionResult> {
    return this.http.post<TraineeBulkActionResult>(API_ENDPOINTS.TRAINING_BATCHES.BULK_LAP, { traineeIds, note: remarks });
  }

  /** "Release Candidate" — explicit override release, most importantly for a trainee who
   *  cleared LAP (the automatic Complete Batch & Release path permanently excludes LAP
   *  trainees). */
  releaseTrainee(traineeId: number): Observable<TraineeDetail> {
    return this.http.post<TraineeDetail>(API_ENDPOINTS.TRAINING_BATCHES.RELEASE(traineeId), {});
  }

  bulkRelease(traineeIds: number[]): Observable<TraineeBulkActionResult> {
    return this.http.post<TraineeBulkActionResult>(API_ENDPOINTS.TRAINING_BATCHES.BULK_RELEASE, traineeIds);
  }

  /** "Flag Candidate" — permanently marks a trainee unsuccessful (failed even after LAP). */
  flagTrainee(traineeId: number, reason?: string): Observable<TraineeDetail> {
    return this.http.post<TraineeDetail>(API_ENDPOINTS.TRAINING_BATCHES.FLAG(traineeId), { remarks: reason });
  }

  bulkFlag(traineeIds: number[], reason?: string): Observable<TraineeBulkActionResult> {
    return this.http.post<TraineeBulkActionResult>(API_ENDPOINTS.TRAINING_BATCHES.BULK_FLAG, { traineeIds, note: reason });
  }

  exportTrainees(batchId: number): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.TRAINING_BATCHES.EXPORT(batchId), { responseType: 'blob' });
  }

  downloadExcelTemplate(): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.TRAINING_BATCHES.EXCEL_TEMPLATE, { responseType: 'blob' });
  }

  validateExcel(batchId: number, file: File): Observable<UploadSummary> {
    return this.http.post<UploadSummary>(API_ENDPOINTS.TRAINING_BATCHES.EXCEL_VALIDATE(batchId), this.buildForm(file));
  }

  commitExcel(batchId: number, file: File): Observable<UploadSummary> {
    return this.http.post<UploadSummary>(API_ENDPOINTS.TRAINING_BATCHES.EXCEL_COMMIT(batchId), this.buildForm(file));
  }

  excelHistory(batchId: number): Observable<UploadSummary[]> {
    return this.http.get<UploadSummary[]>(API_ENDPOINTS.TRAINING_BATCHES.EXCEL_HISTORY(batchId));
  }

  private buildForm(file: File): FormData {
    const form = new FormData();
    form.append('file', file);
    return form;
  }
}
