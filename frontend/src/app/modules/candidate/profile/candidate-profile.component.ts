import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { API_ENDPOINTS } from '../../../config/api-endpoints';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
  selector: 'app-candidate-profile',
  template: `
    <div class="profile-page">
      <app-page-header
        title="My Profile"
        subtitle="View and update your personal information."
      ></app-page-header>

      <mat-card class="profile-card" *ngIf="loaded">
        <mat-card-content>
          <div class="avatar-section">
            <div class="avatar-lg">{{ name?.charAt(0) || 'U' }}</div>
            <div class="user-headline">
              <h2>{{ name }}</h2>
              <span class="role-badge">{{ role }}</span>
            </div>
          </div>

          <div class="form-section">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput [(ngModel)]="name" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input matInput [value]="email" disabled />
              <mat-hint>Email cannot be changed.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Phone</mat-label>
              <input matInput [(ngModel)]="phone" />
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              class="save-btn"
              [disabled]="saving"
              (click)="save()"
            >
              {{ saving ? 'Saving...' : 'Save Changes' }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <app-loader *ngIf="!loaded"></app-loader>
    </div>
  `,
  styles: [
    `
      .profile-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .profile-card {
        border-radius: 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
        max-width: 560px;
      }
      .avatar-section {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 32px;
      }
      .avatar-lg {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: #4f46e5;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 700;
        flex-shrink: 0;
      }
      .user-headline h2 {
        margin: 0;
        color: #1e293b;
      }
      .role-badge {
        font-size: 11px;
        font-weight: 600;
        background: #e0e7ff;
        color: #4338ca;
        padding: 2px 10px;
        border-radius: 12px;
      }
      .form-section {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .full-width {
        width: 100%;
      }
      .save-btn {
        width: 160px;
        height: 40px;
      }
    `,
  ],
  standalone: false,
})
export class CandidateProfileComponent implements OnInit {
  name = '';
  email = '';
  phone = '';
  role = '';
  loaded = false;
  saving = false;

  constructor(
    private http: HttpClient,
    private currentUserService: CurrentUserService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.http.get<any>(API_ENDPOINTS.AUTH.ME).subscribe({
      next: (data) => {
        this.name = data.name;
        this.email = data.email;
        this.phone = data.phone;
        this.role = data.role;
        this.loaded = true;
      },
      error: () => {
        // Fallback to local stored user
        const user = this.currentUserService.getUser();
        if (user) {
          this.name = user.fullName;
          this.email = user.email;
          this.role = user.role;
        }
        this.loaded = true;
      },
    });
  }

  save(): void {
    if (!this.name.trim() || !this.phone.trim()) {
      this.toast.error('Name and phone are required.');
      return;
    }
    this.saving = true;
    this.http
      .put<any>(`${API_ENDPOINTS.AUTH.ME.replace('/me', '/profile')}`, {
        name: this.name,
        phone: this.phone,
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.toast.success('Profile updated successfully.');
          // Update local user data
          const user = this.currentUserService.getUser();
          if (user) {
            user.fullName = res.name;
            this.currentUserService.setUser(user);
          }
        },
        error: (e) => {
          this.saving = false;
          this.toast.error(e.error?.message || 'Failed to update profile.');
        },
      });
  }
}
