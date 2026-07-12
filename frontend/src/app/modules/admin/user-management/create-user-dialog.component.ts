import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminUserService } from '../../../services/admin-user.service';
import { ToastService } from '../../../shared/services/toast.service';

@Component({
    selector: 'app-create-user-dialog',
    template: `
    <h2 mat-dialog-title>Create New User</h2>
    <mat-dialog-content>
      <form [formGroup]="userForm" class="user-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="fullName" placeholder="e.g. John Doe">
          <mat-error *ngIf="userForm.get('fullName')?.invalid">Name is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email Address</mat-label>
          <input matInput formControlName="email" type="email" placeholder="e.g. hr@nexhire.com">
          <mat-error *ngIf="userForm.get('email')?.invalid">Valid email is required</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            <mat-option value="HR">HR</mat-option>
            <mat-option value="RMG">RMG</mat-option>
            <mat-option value="ADMIN">Admin</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Temporary Password</mat-label>
          <input matInput formControlName="password" type="password">
          <mat-error *ngIf="userForm.get('password')?.invalid">Password is required (min 6 chars)</mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close [disabled]="submitting">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="userForm.invalid || submitting" (click)="submit()">Create User</button>
    </mat-dialog-actions>
  `,
    styles: [`
    .user-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 12px;
      min-width: 350px;
    }
    .full-width {
      width: 100%;
    }
  `],
    standalone: false
})
export class CreateUserDialogComponent {
  userForm: FormGroup;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateUserDialogComponent>,
    private adminUserService: AdminUserService,
    private toast: ToastService,
  ) {
    this.userForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['HR', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit(): void {
    if (this.userForm.invalid || this.submitting) return;
    this.submitting = true;
    this.adminUserService.createUser(this.userForm.value).subscribe({
      next: (created) => {
        this.toast.success(`${created.role} user ${created.email} created.`);
        this.dialogRef.close(created);
      },
      error: () => {
        this.submitting = false;
      },
    });
  }
}
