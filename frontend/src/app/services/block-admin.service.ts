import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BlockAdmin, BlockAdminRequest } from '../models/city-admin.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class BlockAdminService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getAll(cityId?: number, availableOnly?: boolean): Observable<BlockAdmin[]> {
    let params = new HttpParams();
    if (cityId != null) params = params.set('cityId', String(cityId));
    if (availableOnly != null) params = params.set('availableOnly', String(availableOnly));
    return this.http.get<BlockAdmin[]>(API_ENDPOINTS.BLOCKS.BASE, { params });
  }

  create(request: BlockAdminRequest): Observable<BlockAdmin> {
    return this.http.post<BlockAdmin>(API_ENDPOINTS.BLOCKS.CREATE, request);
  }

  update(id: number, request: BlockAdminRequest): Observable<BlockAdmin> {
    return this.http.put<BlockAdmin>(API_ENDPOINTS.BLOCKS.UPDATE(id), request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(API_ENDPOINTS.BLOCKS.BY_ID(id));
  }
}
