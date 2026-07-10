import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SKIP_LOADER } from '../core/interceptors/loader-context';

const BASE = environment.apiBaseUrl;

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _unreadCount$ = new BehaviorSubject<number>(0);
  private _notifications$ = new BehaviorSubject<AppNotification[]>([]);

  readonly unreadCount$ = this._unreadCount$.asObservable();
  readonly notifications$ = this._notifications$.asObservable();

  private polling = false;

  constructor(private http: HttpClient) {}

  /** Start polling for unread count every 30 seconds. Call once after login.
   *  Guarded against being started twice (e.g. layout re-init within a session). */
  startPolling(): void {
    if (this.polling) {
      return;
    }
    this.polling = true;
    timer(0, 30000)
      .pipe(switchMap(() => this.fetchUnreadCount()))
      .subscribe();
  }

  /** Silent — deliberately skips the global loader overlay so this background poll
   *  never flashes a full-screen "loading" state over the whole app. */
  fetchUnreadCount(): Observable<{ count: number }> {
    return this.http
      .get<{ count: number }>(`${BASE}/api/notifications/unread-count`, {
        context: new HttpContext().set(SKIP_LOADER, true),
      })
      .pipe(tap((res) => this._unreadCount$.next(res.count)));
  }

  loadNotifications(): Observable<AppNotification[]> {
    return this.http
      .get<AppNotification[]>(`${BASE}/api/notifications/my`)
      .pipe(tap((list) => this._notifications$.next(list)));
  }

  markRead(id: number): Observable<void> {
    return this.http.put<void>(`${BASE}/api/notifications/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http
      .put<void>(`${BASE}/api/notifications/read-all`, {})
      .pipe(tap(() => this._unreadCount$.next(0)));
  }
}
