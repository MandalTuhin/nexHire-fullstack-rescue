import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CandidateProfileRequest,
  CandidateProfileResponse,
} from '../models/candidate-profile.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class CandidateProfileService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Logged-in candidate's own profile. */
  getMyProfile(): Observable<CandidateProfileResponse> {
    return this.http.get<CandidateProfileResponse>(
      API_ENDPOINTS.CANDIDATE_PROFILE.ME,
    );
  }

  /** Full-overwrite save. Callers should send the complete accumulated form state,
   *  not just the fields from the current wizard step. */
  updateMyProfile(
    request: CandidateProfileRequest,
  ): Observable<CandidateProfileResponse> {
    return this.http.put<CandidateProfileResponse>(
      API_ENDPOINTS.CANDIDATE_PROFILE.ME,
      request,
    );
  }

  uploadResume(file: File): Observable<CandidateProfileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CandidateProfileResponse>(
      API_ENDPOINTS.CANDIDATE_PROFILE.RESUME,
      formData,
    );
  }

  downloadMyResume(): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.CANDIDATE_PROFILE.RESUME, {
      responseType: 'blob',
    });
  }

  /** HR/Admin: view a candidate's profile (application review, BGC review, etc). */
  getProfileByUserId(userId: number): Observable<CandidateProfileResponse> {
    return this.http.get<CandidateProfileResponse>(
      API_ENDPOINTS.CANDIDATE_PROFILE.BY_USER(userId),
    );
  }

  downloadResumeByUserId(userId: number): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.CANDIDATE_PROFILE.RESUME_BY_USER(userId), {
      responseType: 'blob',
    });
  }
}
