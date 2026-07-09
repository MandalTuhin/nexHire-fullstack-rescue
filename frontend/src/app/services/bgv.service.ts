import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

export interface Bgv {
  id: number;
  applicationId: number;
  userId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: string;
  vendorName?: string;
  remarks?: string;
  initiatedAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class BgvService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** HR: list all BGV records. */
  getAll(): Observable<Bgv[]> {
    return this.http.get<Bgv[]>(API_ENDPOINTS.BGV.BASE);
  }

  /** Candidate: own BGV records. */
  getMine(): Observable<Bgv[]> {
    return this.http.get<Bgv[]>(`${API_ENDPOINTS.BGV.BASE}/my`);
  }

  /** HR: initiate BGV for an application. */
  initiate(applicationId: number, vendorName?: string): Observable<Bgv> {
    return this.http.post<Bgv>(API_ENDPOINTS.BGV.INITIATE(applicationId), {
      vendorName,
    });
  }

  /** HR / third-party callback: update BGV status. */
  updateStatus(id: number, status: string, remarks?: string): Observable<Bgv> {
    return this.http.put<Bgv>(API_ENDPOINTS.BGV.UPDATE_STATUS(id), {
      status,
      remarks,
    });
  }
}
