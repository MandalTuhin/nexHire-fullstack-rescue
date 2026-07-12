import { Component } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const newPassword = control.get('newPassword')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  return newPassword && confirmPassword && newPassword !== confirmPassword
    ? { passwordMismatch: true }
    : null;
}

@Component({
  selector: 'app-change-password',
  template: `
    <div>
      <app-page-header title="Change Password" subtitle="Update your account password securely."></app-page-header>
      <mat-card style="border-radius: 12px; margin-top: 8px; max-width: 480px;">
        <mat-card-content style="padding: 32px;">
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Current Password</mat-label>
              <input matInput type="password" formControlName="currentPassword" />
              <mat-error *ngIf="form.get('currentPassword')?.hasError('required')">
                Current password is required
              </mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>New Password</mat-label>
              <input matInput type="password" formControlName="newPassword" />
              <mat-error *ngIf="form.get('newPassword')?.hasError('required')">
                New password is required
              </mat-error>
              <mat-error *ngIf="form.get('newPassword')?.hasError('minlength')">
                Password must be at least 6 characters
              </mat-error>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Confirm New Password</mat-label>
              <input matInput type="password" formControlName="confirmPassword" />
              <mat-error *ngIf="form.get('confirmPassword')?.hasError('required')">
                Please confirm your new password
              </mat-error>
              <mat-error *ngIf="form.hasError('passwordMismatch') && !form.get('confirmPassword')?.hasError('required')">
                Passwords do not match
              </mat-error>
            </mat-form-field>
            <button mat-raised-button color="primary" style="width:100%" type="submit" [disabled]="form.invalid || submitting">
              Update Password
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  standalone: false,
})
export class ChangePasswordComponent {
  form: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toast: ToastService,
  ) {
    this.form = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordsMatchValidator },
    );
  }

  submit(): void {
    if (this.form.invalid || this.submitting) return;
    this.submitting = true;
    this.authService.changePassword(this.form.value).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('Password updated successfully.');
        this.form.reset();
      },
      error: (e) => {
        this.submitting = false;
        this.toast.error(e.error?.message || 'Failed to update password');
      },
    });
  }
}
