import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UploadSummary } from '../models/bulk-upload.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class AssessmentExcelService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.ASSESSMENTS.EXCEL_TEMPLATE, { responseType: 'blob' });
  }

  validate(file: File, cutoff: number | null): Observable<UploadSummary> {
    return this.http.post<UploadSummary>(API_ENDPOINTS.ASSESSMENTS.EXCEL_VALIDATE, this.buildForm(file, cutoff));
  }

  commit(file: File, cutoff: number | null): Observable<UploadSummary> {
    return this.http.post<UploadSummary>(API_ENDPOINTS.ASSESSMENTS.EXCEL_COMMIT, this.buildForm(file, cutoff));
  }

  history(): Observable<UploadSummary[]> {
    return this.http.get<UploadSummary[]>(API_ENDPOINTS.ASSESSMENTS.EXCEL_HISTORY);
  }

  private buildForm(file: File, cutoff: number | null): FormData {
    const form = new FormData();
    form.append('file', file);
    if (cutoff !== null && cutoff !== undefined) {
      form.append('cutoff', String(cutoff));
    }
    return form;
  }
}
