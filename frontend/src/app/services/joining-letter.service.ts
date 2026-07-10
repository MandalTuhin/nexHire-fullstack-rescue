import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JoiningLetter } from '../models/joining-letter.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class JoiningLetterService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Candidate: own joining letters (backend derives user from JWT). */
  getMine(): Observable<JoiningLetter[]> {
    return this.http.get<JoiningLetter[]>(API_ENDPOINTS.JOINING_LETTERS.MY);
  }

  downloadPdf(id: number): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.JOINING_LETTERS.PDF(id), { responseType: 'blob' });
  }

  accept(id: number): Observable<JoiningLetter> {
    return this.http.put<JoiningLetter>(API_ENDPOINTS.JOINING_LETTERS.ACCEPT(id), {});
  }

  reject(id: number): Observable<JoiningLetter> {
    return this.http.put<JoiningLetter>(API_ENDPOINTS.JOINING_LETTERS.REJECT(id), {});
  }
}
