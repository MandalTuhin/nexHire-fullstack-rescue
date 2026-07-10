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

  sendLetters(id: number): Observable<JoiningBatch> {
    return this.http.post<JoiningBatch>(API_ENDPOINTS.JOINING_BATCHES.SEND_LETTERS(id), {});
  }
}
