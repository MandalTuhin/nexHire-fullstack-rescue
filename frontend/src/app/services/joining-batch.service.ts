import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EligibleJoiningCandidate,
  JoiningBatch,
  JoiningBatchAutoCreateRequest,
  JoiningBatchCreateRequest,
} from '../models/joining-batch.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

export interface ActivityLogEntry {
  id: number;
  userId?: number;
  userName?: string;
  actionType: string;
  description: string;
  entityType?: string;
  entityId?: number;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class JoiningBatchService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getEligible(joiningLocationId: number): Observable<EligibleJoiningCandidate[]> {
    return this.http.get<EligibleJoiningCandidate[]>(API_ENDPOINTS.JOINING_BATCHES.ELIGIBLE(joiningLocationId));
  }

  getAll(): Observable<JoiningBatch[]> {
    return this.http.get<JoiningBatch[]>(API_ENDPOINTS.JOINING_BATCHES.BASE);
  }

  getById(id: number): Observable<JoiningBatch> {
    return this.http.get<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.BY_ID(id));
  }

  create(request: JoiningBatchCreateRequest): Observable<JoiningBatch> {
    return this.http.post<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.BASE, request);
  }

  autoCreate(request: JoiningBatchAutoCreateRequest): Observable<JoiningBatch[]> {
    return this.http.post<JoiningBatch[]>(API_ENDPOINTS.JOINING_BATCHES.AUTO_CREATE, request);
  }

  generateLetters(id: number): Observable<JoiningBatch> {
    return this.http.post<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.GENERATE_LETTERS(id), {});
  }

  /** Single unified action — generates (if needed), stores, sends, reserves budget for, and
   *  moves the batch into JOINING_ACCEPTANCE_IN_PROGRESS. Safely re-callable after a
   *  remove/replace — only sends to members who don't have a letter yet. */
  sendLetters(id: number): Observable<JoiningBatch> {
    return this.http.post<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.SEND_LETTERS(id), {});
  }

  /** Removes a rejected/expired candidate so a replacement can be added. */
  removeMember(batchId: number, applicationId: number): Observable<JoiningBatch> {
    return this.http.delete<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.REMOVE_MEMBER(batchId, applicationId));
  }

  /** Adds replacement candidate(s) — call sendLetters() again afterwards to issue their letter. */
  addReplacementMembers(batchId: number, applicationIds: number[]): Observable<JoiningBatch> {
    return this.http.post<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.ADD_MEMBERS(batchId), applicationIds);
  }

  /** Resends a letter to one candidate whose joining letter expired. */
  resendLetter(batchId: number, applicationId: number): Observable<JoiningBatch> {
    return this.http.post<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.RESEND_LETTER(batchId, applicationId), {});
  }

  getActivity(batchId: number): Observable<ActivityLogEntry[]> {
    return this.http.get<ActivityLogEntry[]>(API_ENDPOINTS.JOINING_BATCHES.ACTIVITY(batchId));
  }
}
