import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OfferLetter, OfferStatus } from '../models/offer-letter.model';
import { ApplicationBulkActionResult } from '../models/application.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

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

  /** HR: all auto-generated offers, sorted by assessment score desc. */
  getAll(): Observable<OfferLetter[]> {
    return this.http
      .get<BackendOffer[]>(API_ENDPOINTS.OFFERS.BASE)
      .pipe(map((list) => (list || []).map((o) => this.toOffer(o))));
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
