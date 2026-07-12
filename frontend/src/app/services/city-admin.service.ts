import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BudgetAdjustmentRequest,
  BudgetTransaction,
  CityAdmin,
  CityAdminRequest,
} from '../models/city-admin.model';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { BaseService } from './base.service';

@Injectable({ providedIn: 'root' })
export class CityAdminService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getAll(): Observable<CityAdmin[]> {
    return this.http.get<CityAdmin[]>(API_ENDPOINTS.CITIES.BASE);
  }

  create(request: CityAdminRequest): Observable<CityAdmin> {
    return this.http.post<CityAdmin>(API_ENDPOINTS.CITIES.CREATE, request);
  }

  update(id: number, request: CityAdminRequest): Observable<CityAdmin> {
    return this.http.put<CityAdmin>(API_ENDPOINTS.CITIES.UPDATE(id), request);
  }

  getBudgetTransactions(id: number): Observable<BudgetTransaction[]> {
    return this.http.get<BudgetTransaction[]>(API_ENDPOINTS.CITIES.BUDGET_TRANSACTIONS(id));
  }

  allocate(id: number, request: BudgetAdjustmentRequest): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.CITIES.ALLOCATE(id), request);
  }

  adjust(id: number, request: BudgetAdjustmentRequest): Observable<void> {
    return this.http.post<void>(API_ENDPOINTS.CITIES.ADJUST(id), request);
  }
}
