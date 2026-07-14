import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BackgroundVerification,
  BgcCaseDetail,
  BgcDocument,
  BgcDocumentReviewRequest,
  UpdateBgvStatusRequest,
} from '../models/background-verification.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { PagedResponse } from '../models/api-response.model';
import { BaseService } from './base.service';

export interface BgvSearchParams {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
}

/** Raw backend BgvResponse. */
interface BackendBgv {
  id: number;
  applicationId: number;
  userId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: string;
  remarks?: string;
  initiatedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BackgroundVerificationService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** HR: paginated/searchable BGC case list (backend avoids loading every case at once). */
  search(params: BgvSearchParams = {}): Observable<PagedResponse<BackgroundVerification>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 20));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    return this.http
      .get<PagedResponse<BackendBgv>>(API_ENDPOINTS.BGV.BASE, { params: httpParams })
      .pipe(map((page) => ({ ...page, content: page.content.map((b) => this.toModel(b)) })));
  }

  /** Candidate: own BGC cases. */
  getMine(): Observable<BackgroundVerification[]> {
    return this.http
      .get<BackendBgv[]>(`${API_ENDPOINTS.BGV.BASE}/my`)
      .pipe(map((list) => (list || []).map((b) => this.toModel(b))));
  }

  getByApplication(applicationId: number): Observable<BackgroundVerification> {
    return this.http
      .get<BackendBgv>(API_ENDPOINTS.BGV.BY_APPLICATION(applicationId))
      .pipe(map((b) => this.toModel(b)));
  }

  /** HR manual fallback — the normal flow auto-initiates on offer acceptance. */
  initiate(applicationId: number): Observable<BackgroundVerification> {
    return this.http
      .post<BackendBgv>(API_ENDPOINTS.BGV.INITIATE(applicationId), {})
      .pipe(map((b) => this.toModel(b)));
  }

  updateStatus(id: number, request: UpdateBgvStatusRequest): Observable<BackgroundVerification> {
    return this.http.put<BackendBgv>(API_ENDPOINTS.BGV.UPDATE_STATUS(id), request)
      .pipe(map((b) => this.toModel(b)));
  }

  /** HR: reopens a locked (submitted/under-review) case so the candidate can upload missing or
   *  corrected documents again. */
  reopenSubmission(id: number): Observable<BackgroundVerification> {
    return this.http.put<BackendBgv>(API_ENDPOINTS.BGV.REOPEN(id), {})
      .pipe(map((b) => this.toModel(b)));
  }

  getDetail(id: number): Observable<BgcCaseDetail> {
    return this.http.get<BgcCaseDetail>(API_ENDPOINTS.BGV.DETAIL(id));
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  uploadDocument(applicationId: number, documentType: string, file: File): Observable<BgcDocument> {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file);
    return this.http.post<BgcDocument>(API_ENDPOINTS.BGV.UPLOAD_DOCUMENT(applicationId), form);
  }

  getMyDocuments(applicationId: number): Observable<BgcDocument[]> {
    return this.http.get<BgcDocument[]>(API_ENDPOINTS.BGV.MY_DOCUMENTS(applicationId));
  }

  /** Candidate: explicit "Submit BGV Documents" action — locks the set for HR review. */
  submitDocuments(applicationId: number): Observable<BackgroundVerification> {
    return this.http
      .put<BackendBgv>(API_ENDPOINTS.BGV.SUBMIT_DOCUMENTS(applicationId), {})
      .pipe(map((b) => this.toModel(b)));
  }

  getCaseDocuments(bgcCaseId: number): Observable<BgcDocument[]> {
    return this.http.get<BgcDocument[]>(API_ENDPOINTS.BGV.CASE_DOCUMENTS(bgcCaseId));
  }

  reviewDocument(documentId: number, request: BgcDocumentReviewRequest): Observable<BgcDocument> {
    return this.http.put<BgcDocument>(API_ENDPOINTS.BGV.REVIEW_DOCUMENT(documentId), request);
  }

  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.BGV.DOWNLOAD_DOCUMENT(documentId), { responseType: 'blob' });
  }

  private toModel(b: BackendBgv): BackgroundVerification {
    return {
      bgvId: b.id,
      applicationId: b.applicationId,
      userId: b.userId,
      candidateName: b.candidateName,
      candidateEmail: b.candidateEmail,
      jobTitle: b.jobTitle,
      status: b.status as any,
      remarks: b.remarks,
      initiatedDate: b.initiatedAt,
      completedDate: b.completedAt,
      updatedAt: b.updatedAt,
    };
  }
}
