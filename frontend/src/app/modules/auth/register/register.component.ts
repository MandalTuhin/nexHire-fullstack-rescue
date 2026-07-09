import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
    selector: 'app-register',
    template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header class="register-header">
          <mat-card-title>Candidate Registration</mat-card-title>
          <mat-card-subtitle>Create an account to explore jobs and track applications</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
            <!-- Step 1: Account Info -->
            <div class="form-section">
              <h3>Account Credentials</h3>
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
                  <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Phone Number</mat-label>
                  <input matInput formControlName="phone" placeholder="9876543210">
                  <mat-error *ngIf="registerForm.get('phone')?.hasError('required')">Phone is required</mat-error>
                  <mat-error *ngIf="registerForm.get('phone')?.hasError('pattern')">Enter a valid 10-digit number</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Password</mat-label>
                  <input matInput [type]="hidePassword ? 'password' : 'text'" formControlName="password">
                  <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                    <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                  <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Password is required</mat-error>
                  <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">Must be at least 6 characters</mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Step 2: Personal Info -->
            <div class="form-section">
              <h3>Personal Details</h3>
              <div class="form-row">
                <mat-form-field appearance="outline" class="third-width">
                  <mat-label>Gender</mat-label>
                  <mat-select formControlName="gender">
                    <mat-option value="MALE">Male</mat-option>
                    <mat-option value="FEMALE">Female</mat-option>
                    <mat-option value="OTHER">Other</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" class="third-width">
                  <mat-label>City</mat-label>
                  <input matInput formControlName="city" placeholder="Bangalore">
                  <mat-error *ngIf="registerForm.get('city')?.hasError('required')">City is required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="third-width">
                  <mat-label>Pin Code</mat-label>
                  <input matInput formControlName="pinCode" placeholder="560001">
                  <mat-error *ngIf="registerForm.get('pinCode')?.hasError('required')">Pin Code is required</mat-error>
                  <mat-error *ngIf="registerForm.get('pinCode')?.hasError('pattern')">Must be a 6-digit number</mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Step 3: Education Info -->
            <div class="form-section">
              <h3>Academic Background</h3>
              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Highest Qualification</mat-label>
                  <input matInput formControlName="highestQualification" placeholder="e.g. B.Tech Computer Science">
                  <mat-error *ngIf="registerForm.get('highestQualification')?.hasError('required')">Qualification is required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>University Name</mat-label>
                  <input matInput formControlName="universityName" placeholder="VTU">
                  <mat-error *ngIf="registerForm.get('universityName')?.hasError('required')">University is required</mat-error>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Graduation Year</mat-label>
                  <input matInput type="number" formControlName="graduationYear" placeholder="2025">
                  <mat-error *ngIf="registerForm.get('graduationYear')?.hasError('required')">Year is required</mat-error>
                  <mat-error *ngIf="registerForm.get('graduationYear')?.hasError('min')">Must be a valid year</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>CGPA</mat-label>
                  <input matInput type="number" step="0.01" formControlName="cgpa" placeholder="9.50">
                  <mat-error *ngIf="registerForm.get('cgpa')?.hasError('required')">CGPA is required</mat-error>
                  <mat-error *ngIf="registerForm.get('cgpa')?.hasError('min') || registerForm.get('cgpa')?.hasError('max')">CGPA must be between 0.00 and 10.00</mat-error>
                </mat-form-field>
              </div>
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
      border-top: 1px solid #f1f5f9;
      padding-top: 16px;
    }
    .form-section:first-of-type {
      border-top: none;
      padding-top: 0;
    }
    .form-section h3 {
      margin: 0 0 8px 0;
      font-size: 15px;
      font-weight: 600;
      color: #334155;
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
    .third-width {
      flex: 1;
      min-width: 180px;
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
      color: #3f51b5;
      font-weight: 600;
      text-decoration: none;
    }
  `],
    standalone: false
})
export class RegisterComponent implements OnInit {
  registerForm!: FormGroup;
  hidePassword = true;
  isLoading = false;

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
      password: ['', [Validators.required, Validators.minLength(6)]],
      gender: ['MALE', Validators.required],
      city: ['', Validators.required],
      pinCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      highestQualification: ['', Validators.required],
      universityName: ['', Validators.required],
      graduationYear: [2025, [Validators.required, Validators.min(1980)]],
      cgpa: [8.50, [Validators.required, Validators.min(0), Validators.max(10)]],
    });
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
      error: (err) => {
        this.isLoading = false;
        this.toastService.error(err.message || 'Registration failed. Try again.');
      }
    });
  }
}
