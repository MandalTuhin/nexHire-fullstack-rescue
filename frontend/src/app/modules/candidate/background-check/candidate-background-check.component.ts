import { Component, OnInit } from '@angular/core';
import { ApplicationService } from '../../../services/application.service';
import { BackgroundVerificationService } from '../../../services/background-verification.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BackgroundVerification, BgcDocument } from '../../../models/background-verification.model';

@Component({
  selector: 'app-candidate-background-check',
  template: `
    <div class="bgc-page">
      <app-page-header
        title="Background Verification"
        subtitle="Upload the requested documents so we can complete your background check"
      ></app-page-header>

      <app-loader *ngIf="loading"></app-loader>

      <app-empty-state
        *ngIf="!loading && !bgv"
        icon="verified_user"
        title="No background check in progress"
        subtitle="This section becomes active once you accept an offer."
      ></app-empty-state>

      <ng-container *ngIf="!loading && bgv">
        <mat-card class="status-card">
          <mat-card-content class="status-row">
            <div>
              <span class="label">Status</span>
              <app-status-badge [status]="bgv.status"></app-status-badge>
            </div>
            <div *ngIf="bgv.vendorName">
              <span class="label">Vendor</span>
              <span class="value">{{ bgv.vendorName }}</span>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="upload-card" *ngIf="bgv.status === 'DOCUMENTS_PENDING' || bgv.status === 'DOCUMENTS_SUBMITTED'">
          <mat-card-header>
            <mat-card-title>Upload a Document</mat-card-title>
          </mat-card-header>
          <mat-card-content class="upload-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Document Type</mat-label>
              <mat-select [(ngModel)]="documentType">
                <mat-option value="GOVT_ID">Government ID</mat-option>
                <mat-option value="ADDRESS_PROOF">Address Proof</mat-option>
                <mat-option value="EDUCATION_CERTIFICATE">Education Certificate</mat-option>
                <mat-option value="PREVIOUS_EMPLOYMENT_PROOF">Previous Employment Proof</mat-option>
                <mat-option value="PHOTO">Photograph</mat-option>
                <mat-option value="OTHER">Other</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="dropzone" (click)="fileInput.click()">
              <input type="file" hidden #fileInput (change)="onFileSelected($event)" />
              <mat-icon>cloud_upload</mat-icon>
              <span>{{ selectedFile ? selectedFile.name : 'Click to choose a file' }}</span>
            </div>

            <button mat-raised-button color="primary" [disabled]="!selectedFile || uploading" (click)="upload()">
              {{ uploading ? 'Uploading…' : 'Upload Document' }}
            </button>
          </mat-card-content>
        </mat-card>

        <mat-card class="docs-card">
          <mat-card-header>
            <mat-card-title>Your Documents</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state *ngIf="documents.length === 0" icon="description" title="No documents uploaded yet"></app-empty-state>
            <div class="doc-row" *ngFor="let doc of documents">
              <div class="doc-info">
                <span class="doc-type">{{ doc.documentType }}</span>
                <span class="doc-file">{{ doc.fileName }}</span>
              </div>
              <div class="doc-status">
                <app-status-badge [status]="doc.status"></app-status-badge>
                <span class="doc-remarks" *ngIf="doc.remarks">{{ doc.remarks }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .bgc-page {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .status-card,
      .upload-card,
      .docs-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }
      .status-row {
        display: flex;
        gap: 32px;
        flex-wrap: wrap;
      }
      .status-row .label {
        display: block;
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
        margin-bottom: 4px;
      }
      .status-row .value {
        font-size: 14px;
        font-weight: 600;
        color: #1e293b;
      }
      .upload-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .full-width {
        width: 100%;
      }
      .dropzone {
        border: 2px dashed #cbd5e1;
        border-radius: 10px;
        padding: 28px;
        text-align: center;
        cursor: pointer;
        color: #64748b;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      }
      .dropzone:hover {
        border-color: #818cf8;
        background: #eef2ff;
      }
      .doc-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 8px;
      }
      .doc-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .doc-type {
        font-weight: 600;
        font-size: 13px;
        color: #1e293b;
      }
      .doc-file {
        font-size: 12px;
        color: #64748b;
      }
      .doc-status {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
      }
      .doc-remarks {
        font-size: 11px;
        color: #c2410c;
        max-width: 220px;
        text-align: right;
      }
    `,
  ],
  standalone: false,
})
export class CandidateBackgroundCheckComponent implements OnInit {
  loading = true;
  bgv: BackgroundVerification | null = null;
  documents: BgcDocument[] = [];
  applicationId: number | null = null;

  documentType = 'GOVT_ID';
  selectedFile: File | null = null;
  uploading = false;

  constructor(
    private appService: ApplicationService,
    private bgvService: BackgroundVerificationService,
    private currentUserService: CurrentUserService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    const user = this.currentUserService.getUser();
    if (!user?.userId) {
      this.loading = false;
      return;
    }
    this.appService.getByUser(user.userId).subscribe({
      next: (apps) => {
        const bgcApp = apps.find(
          (a) =>
            a.status.startsWith('BGC_') ||
            a.status === 'EMPLOYEE_CREATED' ||
            a.status === 'SELECTED_USER_CREATED' ||
            a.status.startsWith('JOINING_'),
        );
        if (!bgcApp) {
          this.loading = false;
          return;
        }
        this.applicationId = bgcApp.applicationId;
        this.loadCase();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadCase(): void {
    if (!this.applicationId) return;
    this.bgvService.getByApplication(this.applicationId).subscribe({
      next: (bgv) => {
        this.bgv = bgv;
        this.loading = false;
        this.loadDocuments();
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private loadDocuments(): void {
    if (!this.applicationId) return;
    this.bgvService.getMyDocuments(this.applicationId).subscribe((docs) => (this.documents = docs));
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  upload(): void {
    if (!this.applicationId || !this.selectedFile) return;
    this.uploading = true;
    this.bgvService.uploadDocument(this.applicationId, this.documentType, this.selectedFile).subscribe({
      next: () => {
        this.uploading = false;
        this.selectedFile = null;
        this.toastService.success('Document uploaded successfully.');
        this.loadCase();
      },
      error: (e) => {
        this.uploading = false;
        this.toastService.error(e.error?.message || 'Upload failed.');
      },
    });
  }
}
