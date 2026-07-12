import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { CurrentUserService } from '../auth/current-user.service';
import { ToastService } from '../../shared/services/toast.service';
import { SUPPRESS_404_TOAST, SUPPRESS_ERROR_TOAST } from './error-context';

/**
 * ErrorInterceptor: single, app-wide place that turns a failed HTTP request into a user-facing
 * toast — this is the ONLY place that should call toastService.error/warning for a failed
 * request. Individual components must not also toast on the same failure (that's what produced
 * duplicate toasts); they should only update their own local state (loading flags, etc.) in
 * their `error` callback. A request that needs to fail silently (optional/background lookups,
 * or a component that shows its own inline/custom message) should set SUPPRESS_ERROR_TOAST (or
 * SUPPRESS_404_TOAST for just the 404 case) on its HttpContext.
 *
 * Never surfaces raw technical detail (API URLs, backend paths, HTTP status text, stack traces)
 * to the user — only the backend's own clean `message` field (already user-oriented business
 * text, e.g. "Cannot accept offer: ...") or a generic fallback, never HttpErrorResponse.message
 * (which embeds the request URL and status text).
 */
@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private currentUserService: CurrentUserService,
    private router: Router,
    private toastService: ToastService,
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(req, error);
        return throwError(() => error);
      })
    );
  }

  private handleError(req: HttpRequest<any>, error: HttpErrorResponse): void {
    const suppressToast = req.context.get(SUPPRESS_ERROR_TOAST);
    const isLoginRequest = req.url.endsWith('/api/auth/login');

    // An ordinary failed login attempt is not a session expiry — no logout/redirect, and a
    // specific "wrong credentials" message rather than the generic session-expired one.
    if (error.status === 401 && isLoginRequest) {
      if (!suppressToast) {
        this.toastService.error(this.friendlyMessage(error, 'Invalid email address or password.'));
      }
      return;
    }

    if (error.status === 401) {
      this.currentUserService.clearUser();
      if (!suppressToast) {
        this.toastService.error('Your session has expired. Please log in again.');
      }
      this.router.navigate(['/auth/login']);
      return;
    }

    if (error.status === 403) {
      if (!suppressToast) {
        this.toastService.warning('You do not have permission to perform this action.');
      }
      this.router.navigate(['/error/403']);
      return;
    }

    if (error.status === 404) {
      if (!suppressToast && !req.context.get(SUPPRESS_404_TOAST)) {
        this.toastService.error('The requested record could not be found.');
      }
      return;
    }

    if (suppressToast) return;

    if (error.status === 0) {
      this.toastService.error('Unable to connect to the server. Please check your connection.');
    } else if (error.status >= 500) {
      this.toastService.error('Something went wrong on our end. Please try again.');
    } else if (error.status >= 400) {
      this.toastService.error(this.friendlyMessage(error, 'Unable to complete the request. Please try again.'));
    }
  }

  /** The backend's own `message` field is already clean, user-oriented text — safe to show
   *  as-is. Deliberately never falls back to HttpErrorResponse.message, which embeds the raw
   *  request URL and HTTP status text (e.g. "Http failure response for http://.../api/x: 404..."). */
  private friendlyMessage(error: HttpErrorResponse, fallback: string): string {
    const backendMessage = error.error?.message;
    return typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : fallback;
  }
}
