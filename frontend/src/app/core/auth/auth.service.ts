import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { Router } from '@angular/router';

import { API_ENDPOINTS } from '../../config/api-endpoints';
import { TokenService } from './token.service';
import { CurrentUserService } from './current-user.service';
import {
  LoginRequest,
  RegisterRequest,
  LoggedInUser,
  ChangePasswordRequest,
} from '../../models/user.model';

/**
 * Backend login/register response shape:
 * { token, userId, name, email, role, lifecycleStatus }
 */
interface BackendAuthResponse {
  token: string;
  userId: number;
  name: string;
  email: string;
  role: string;
  lifecycleStatus: string | null;
  mustChangePassword?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private currentUserService: CurrentUserService,
    private router: Router,
  ) {}

  // ─── Register ───────────────────────────────────────────────────────────────
  // Backend registers as role=EMPLOYEE, lifecycleStatus=CANDIDATE and returns a token.
  register(request: RegisterRequest): Observable<LoggedInUser> {
    const payload = {
      name: request.fullName,
      email: request.email,
      password: request.password,
      phone: request.phone,
    };
    return this.http
      .post<BackendAuthResponse>(API_ENDPOINTS.AUTH.REGISTER, payload)
      .pipe(map((res) => this.persistAuth(res)));
  }

  // ─── Login ────────────────────────────────────────────────────────────────────
  login(request: LoginRequest): Observable<LoggedInUser> {
    return this.http
      .post<BackendAuthResponse>(API_ENDPOINTS.AUTH.LOGIN, request)
      .pipe(
        map((res) => this.persistAuth(res)),
        tap((user) => this.navigateToPortal(user.role, user.mustChangePassword)),
      );
  }

  /** Redirect user to their designated portal based on backend role. Admin-created
   *  internal users (HR/RMG/Admin) with a temp password go straight to Change
   *  Password instead of the dashboard until they've set their own. */
  navigateToPortal(role: string, mustChangePassword = false): void {
    const r = role?.toUpperCase();
    const portal = this.portalPrefix(r);
    if (!portal) {
      this.router.navigate(['/auth/login']);
      return;
    }
    if (mustChangePassword) {
      this.router.navigate([`/${portal}/change-password`]);
    } else {
      this.router.navigate([`/${portal}`]);
    }
  }

  private portalPrefix(normalizedRole: string): string | null {
    if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'CANDIDATE') {
      return 'candidate';
    } else if (normalizedRole === 'HR' || normalizedRole === 'TRAINING_MANAGER') {
      return 'hr';
    } else if (normalizedRole === 'RMG') {
      return 'rmg';
    } else if (normalizedRole === 'ADMIN') {
      return 'admin';
    }
    return null;
  }

  // ─── Change Password ────────────────────────────────────────────────────────
  changePassword(request: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http
      .put<{ message: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, request)
      .pipe(
        tap(() => {
          const user = this.currentUserService.getUser();
          if (user) {
            this.currentUserService.setUser({ ...user, mustChangePassword: false });
          }
        }),
      );
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────
  logout(): void {
    this.currentUserService.clearUser();
    this.router.navigate(['/auth/login']);
  }

  // ─── Current User ─────────────────────────────────────────────────────────────
  isLoggedIn(): boolean {
    return this.currentUserService.isLoggedIn();
  }

  getRole(): string | null {
    return this.currentUserService.getRole();
  }

  isCandidate(): boolean {
    const role = this.getRole()?.toUpperCase();
    return role === 'EMPLOYEE' || role === 'CANDIDATE' || role === null;
  }

  isManagement(): boolean {
    const role = this.getRole()?.toUpperCase();
    return role !== null && role !== 'EMPLOYEE' && role !== 'CANDIDATE';
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  private persistAuth(res: BackendAuthResponse): LoggedInUser {
    if (res.token) {
      this.tokenService.setToken(res.token);
    }
    const user = this.buildLoggedInUser(res);
    this.currentUserService.setUser(user);
    return user;
  }

  private buildLoggedInUser(data: BackendAuthResponse): LoggedInUser {
    return {
      userId: data.userId,
      fullName: data.name ?? '',
      email: data.email ?? '',
      // Normalize backend EMPLOYEE role to CANDIDATE for the candidate portal UX
      role: this.normalizeRole(data.role, data.lifecycleStatus),
      lifecycleStatus: data.lifecycleStatus ?? undefined,
      permissions: [],
      active: true,
      mustChangePassword: data.mustChangePassword ?? false,
    };
  }

  /**
   * The backend uses role=EMPLOYEE for candidates/trainees, distinguished by lifecycleStatus.
   * The frontend portals key off CANDIDATE. Map EMPLOYEE -> CANDIDATE so the candidate
   * portal + guards work, while HR/RMG/ADMIN pass through unchanged.
   */
  private normalizeRole(role: string, lifecycleStatus: string | null): string {
    const r = role?.toUpperCase();
    if (r === 'EMPLOYEE') {
      return 'CANDIDATE';
    }
    return r;
  }
}
