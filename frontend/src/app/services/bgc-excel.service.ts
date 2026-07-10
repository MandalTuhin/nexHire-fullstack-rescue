import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UploadSummary } from '../models/bulk-upload.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class BgcExcelService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  downloadTemplate(): Observable<Blob> {
    return this.http.get(API_ENDPOINTS.BGV.EXCEL_TEMPLATE, { responseType: 'blob' });
  }

  validate(file: File): Observable<UploadSummary> {
    return this.http.post<UploadSummary>(API_ENDPOINTS.BGV.EXCEL_VALIDATE, this.buildForm(file));
  }

  commit(file: File): Observable<UploadSummary> {
    return this.http.post<UploadSummary>(API_ENDPOINTS.BGV.EXCEL_COMMIT, this.buildForm(file));
  }

  history(): Observable<UploadSummary[]> {
    return this.http.get<UploadSummary[]>(API_ENDPOINTS.BGV.EXCEL_HISTORY);
  }

  private buildForm(file: File): FormData {
    const form = new FormData();
    form.append('file', file);
    return form;
  }
}
