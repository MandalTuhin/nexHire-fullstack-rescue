import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_ENDPOINTS } from '../config/api-endpoints';
import { PagedResponse } from '../models/api-response.model';
import { BaseService } from './base.service';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  lifecycleStatus?: string;
  active: boolean;
  createdAt?: string;
}

export interface AdminUserSearchParams {
  search?: string;
  role?: string;
  page?: number;
  size?: number;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AdminUserService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** ADMIN: paginated/searchable user list (backend avoids loading all ~5000 seeded users at once). */
  search(params: AdminUserSearchParams = {}): Observable<PagedResponse<AdminUser>> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 20));
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.role) httpParams = httpParams.set('role', params.role);
    return this.http.get<PagedResponse<AdminUser>>(API_ENDPOINTS.USERS.BASE, { params: httpParams });
  }

  /** Convenience for small "assign to a user" pickers elsewhere (e.g. Assets) — first page only,
   *  not a full-list load. For browsing/searching the full user base, use `search()`. */
  getAllUsers(size = 100): Observable<AdminUser[]> {
    return this.search({ size }).pipe(map((page) => page.content));
  }

  /** ADMIN: create an internal user (HR/RMG/Admin) with a temporary password. */
  createUser(request: CreateUserRequest): Observable<AdminUser> {
    return this.http.post<AdminUser>(API_ENDPOINTS.USERS.BASE, request);
  }

  updateRole(id: number, role: string): Observable<AdminUser> {
    return this.http.put<AdminUser>(API_ENDPOINTS.USERS.UPDATE_ROLE(id), {
      role,
    });
  }

  deactivate(id: number): Observable<AdminUser> {
    return this.http.put<AdminUser>(API_ENDPOINTS.USERS.DEACTIVATE(id), {});
  }

  reactivate(id: number): Observable<AdminUser> {
    return this.http.put<AdminUser>(API_ENDPOINTS.USERS.REACTIVATE(id), {});
  }

  getRoles(): Observable<{ name: string; description: string }[]> {
    return this.http.get<{ name: string; description: string }[]>(
      API_ENDPOINTS.ROLES.BASE,
    );
  }
}
