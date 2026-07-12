import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OfferLetter, OfferStatus } from '../models/offer-letter.model';
import { ApplicationBulkActionResult } from '../models/application.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { PagedResponse } from '../models/api-response.model';
import { BaseService } from './base.service';

export interface OfferSearchParams {
  search?: string;
  status?: string;
  page?: number;
  size?: number;
}

/** Raw shape returned by the backend OfferResponse DTO. */
interface BackendOffer {
  id: number;
  applicationId: number;
  userId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  assessmentScore?: number;
  content: string;
  pdfFileId?: number;
  status: string;
  generatedAt: string;
  sentByName?: string;
  sentAt?: string;
  respondedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class OfferLetterService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** HR: paginated/searchable offer list, sorted by assessment score desc (backend avoids
   *  loading every offer at once). */
  search(params: OfferSearchParams = {}): Observable<PagedResponse<OfferLetter>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 20));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.status) httpParams = httpParams.set('status', params.status);
    return this.http
      .get<PagedResponse<BackendOffer>>(API_ENDPOINTS.OFFERS.BASE, { params: httpParams })
      .pipe(map((page) => ({ ...page, content: page.content.map((o) => this.toOffer(o)) })));
  }

  /** HR: full application-id list of GENERATED offers sorted by score desc — backs the
   *  "Select Top N / Select All" bulk-send shortcuts, independent of the paginated table. */
  getGeneratedIdsSortedByScore(): Observable<number[]> {
    return this.http.get<number[]>(API_ENDPOINTS.OFFERS.GENERATED_IDS);
  }

  /** Candidate: own offers. Backend derives the user from JWT. */
  getByUser(_userId: number): Observable<OfferLetter[]> {
    return this.http
      .get<BackendOffer[]>(API_ENDPOINTS.OFFERS.MY)
      .pipe(map((list) => (list || []).map((o) => this.toOffer(o))));
  }

  /** HR: send the auto-generated offer for a single application (OFFER_GENERATED -> OFFER_SENT). */
  sendOffer(applicationId: number, note?: string): Observable<OfferLetter> {
    return this.http
      .post<BackendOffer>(API_ENDPOINTS.OFFERS.SEND(applicationId), { note })
      .pipe(map((o) => this.toOffer(o)));
  }

  /** HR: bulk-send (select top 30 / top 60 / manual on the offer-generated list). */
  bulkSend(applicationIds: number[]): Observable<ApplicationBulkActionResult> {
    return this.http.post<ApplicationBulkActionResult>(API_ENDPOINTS.OFFERS.BULK_SEND, {
      applicationIds,
    });
  }

  downloadPdf(offerId: number): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.OFFERS.PDF(offerId), { responseType: 'blob' });
  }

  /** Candidate accept/reject. `id` is the offer id. */
  updateStatus(id: number, status: 'ACCEPTED' | 'REJECTED'): Observable<OfferLetter> {
    const url = status === 'ACCEPTED' ? API_ENDPOINTS.OFFERS.ACCEPT(id) : API_ENDPOINTS.OFFERS.REJECT(id);
    return this.http.put<BackendOffer>(url, {}).pipe(map((o) => this.toOffer(o)));
  }

  // ─── Mapping ──────────────────────────────────────────────────────────────
  private toOffer(b: BackendOffer): OfferLetter {
    return {
      offerId: b.id,
      applicationId: b.applicationId,
      userId: b.userId,
      candidateName: b.candidateName,
      candidateEmail: b.candidateEmail,
      jobTitle: b.jobTitle,
      assessmentScore: b.assessmentScore,
      content: b.content,
      pdfFileId: b.pdfFileId,
      status: this.mapStatus(b.status),
      generatedAt: b.generatedAt,
      sentByName: b.sentByName,
      sentAt: b.sentAt,
      respondedAt: b.respondedAt,
    };
  }

  /** Backend surfaces the application status (OFFER_GENERATED/OFFER_SENT/OFFER_ACCEPTED/OFFER_REJECTED). */
  private mapStatus(backendStatus: string): OfferStatus {
    switch (backendStatus) {
      case 'OFFER_SENT':
        return 'SENT';
      case 'OFFER_ACCEPTED':
        return 'ACCEPTED';
      case 'OFFER_REJECTED':
        return 'REJECTED';
      case 'OFFER_GENERATED':
      default:
        return 'GENERATED';
    }
  }
}
