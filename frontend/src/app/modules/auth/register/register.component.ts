import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { CustomValidators } from '../../../shared/validators/custom-validators';

@Component({
    selector: 'app-register',
    template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header class="register-header">
          <mat-card-title>Candidate Registration</mat-card-title>
          <mat-card-subtitle>Create an account to browse hiring drives and track your applications. You can add your personal and academic details later, before applying to a drive.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
            <div class="form-section">
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Full Name</mat-label>
                  <input matInput formControlName="fullName" placeholder="John Doe">
                  <mat-error *ngIf="registerForm.get('fullName')?.hasError('required')">Full Name is required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Email Address</mat-label>
                  <input matInput type="email" formControlName="email" placeholder="john@example.com">
                  <mat-error *ngIf="registerForm.get('email')?.hasError('required')">Email is required</mat-error>
                  <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Please enter a valid email address.</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Phone Number</mat-label>
                  <input matInput formControlName="phone" placeholder="9876543210">
                  <mat-error *ngIf="registerForm.get('phone')?.hasError('required')">Phone is required</mat-error>
                  <mat-error *ngIf="registerForm.get('phone')?.hasError('pattern')">Enter a valid 10-digit number</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Password</mat-label>
                  <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password" (focus)="passwordFocused = true">
                  <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button" [attr.aria-label]="'Toggle password visibility'">
                    <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                  <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Password is required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Confirm Password</mat-label>
                  <input matInput [type]="hideConfirmPassword ? 'password' : 'text'" formControlName="confirmPassword">
                  <button mat-icon-button matSuffix (click)="hideConfirmPassword = !hideConfirmPassword" type="button" [attr.aria-label]="'Toggle confirm password visibility'">
                    <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                  <mat-error *ngIf="registerForm.get('confirmPassword')?.hasError('required')">Please confirm your password</mat-error>
                  <mat-error *ngIf="registerForm.get('confirmPassword')?.hasError('mismatch')">Passwords do not match</mat-error>
                </mat-form-field>
              </div>

              <ul class="password-checklist" *ngIf="passwordFocused">
                <li [class.met]="!passwordErrors?.['minLength']">
                  <mat-icon>{{ !passwordErrors?.['minLength'] ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  At least 8 characters
                </li>
                <li [class.met]="!passwordErrors?.['upper']">
                  <mat-icon>{{ !passwordErrors?.['upper'] ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  One uppercase letter
                </li>
                <li [class.met]="!passwordErrors?.['lower']">
                  <mat-icon>{{ !passwordErrors?.['lower'] ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  One lowercase letter
                </li>
                <li [class.met]="!passwordErrors?.['digit']">
                  <mat-icon>{{ !passwordErrors?.['digit'] ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  One number
                </li>
                <li [class.met]="!passwordErrors?.['special']">
                  <mat-icon>{{ !passwordErrors?.['special'] ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
                  One special character
                </li>
              </ul>
            </div>

            <button mat-raised-button color="primary" type="submit" [disabled]="registerForm.invalid || isLoading" class="register-submit-btn">
              <span *ngIf="!isLoading">Register Account</span>
              <mat-spinner diameter="20" *ngIf="isLoading"></mat-spinner>
            </button>
          </form>
        </mat-card-content>
        <mat-card-actions class="register-actions">
          <p>Already have an account? <a routerLink="/auth/login">Login here</a></p>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
    styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px 20px;
      background-color: #f8fafc;
    }
    .register-card {
      width: 100%;
      max-width: 700px;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05) !important;
    }
    .register-header {
      margin-bottom: 24px;
      flex-direction: column;
      align-items: flex-start;
      padding: 0 !important;
    }
    mat-card-title {
      font-size: 24px !important;
      font-weight: 700 !important;
      color: #1e293b;
      margin-bottom: 8px !important;
    }
    mat-card-subtitle {
      font-size: 14px !important;
      color: #64748b;
    }
    .register-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .form-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .form-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .half-width {
      flex: 1;
      min-width: 280px;
    }
    .password-checklist {
      list-style: none;
      margin: -4px 0 4px;
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px 16px;
    }
    .password-checklist li {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #94a3b8;
    }
    .password-checklist li.met {
      color: #15803d;
    }
    .password-checklist li mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    .register-submit-btn {
      width: 100%;
      height: 48px;
      margin-top: 16px;
      font-weight: 600;
      font-size: 16px;
    }
    .register-actions {
      justify-content: center;
      margin-top: 24px;
      padding: 0 !important;
    }
    .register-actions p {
      margin: 0;
      font-size: 14px;
      color: #64748b;
    }
    .register-actions a {
      color: var(--brand-600);
      font-weight: 600;
      text-decoration: none;
    }
  `],
    standalone: false
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  isLoading = false;
  passwordFocused = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      password: ['', [Validators.required, CustomValidators.passwordComplexity()]],
      confirmPassword: ['', Validators.required],
    }, { validators: CustomValidators.passwordsMatch() });
  }

  get passwordErrors() {
    return this.registerForm.get('password')?.errors;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.toastService.success('Registration successful! Please login.');
        this.router.navigate(['/auth/login']);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }
}
