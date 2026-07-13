import { Component, OnInit } from '@angular/core';
import { ApplicationService } from '../../../services/application.service';
import { BackgroundVerificationService } from '../../../services/background-verification.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { ToastService } from '../../../shared/services/toast.service';
import { BackgroundVerification, BgcDocument, BgvStatus } from '../../../models/background-verification.model';

interface RequiredDocType {
  type: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-candidate-background-check',
  template: `
    <div class="bgc-page">
      <app-page-header
        title="Background Check"
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
        <!-- Hero status card -->
        <mat-card class="hero-card" [ngClass]="statusAccentClass()">
          <mat-card-content class="hero-row">
            <div class="hero-icon" [ngClass]="statusAccentClass()">
              <mat-icon>{{ statusIcon() }}</mat-icon>
            </div>
            <div class="hero-body">
              <span class="hero-eyebrow">Status</span>
              <div class="hero-status-line">
                <app-status-badge [status]="bgv.status"></app-status-badge>
              </div>
              <p class="hero-desc">{{ statusDescription() }}</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Required documents checklist, NextStep-style vertical timeline -->
        <mat-card class="checklist-card">
          <mat-card-header>
            <mat-card-title>Document Checklist</mat-card-title>
            <mat-card-subtitle>Track the status of every document we need from you</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="checklist">
              <div class="checklist-row" *ngFor="let req of requiredDocTypes; let last = last">
                <div class="checklist-marker">
                  <div class="checklist-dot" [ngClass]="checklistDotClass(req.type)">
                    <mat-icon>{{ checklistIcon(req.type) }}</mat-icon>
                  </div>
                  <div class="checklist-line" *ngIf="!last"></div>
                </div>
                <div class="checklist-card-inner">
                  <div class="checklist-heading">
                    <mat-icon class="checklist-type-icon">{{ req.icon }}</mat-icon>
                    <span class="checklist-label">{{ req.label }}</span>
                    <app-status-badge
                      *ngIf="documentFor(req.type) as doc"
                      [status]="doc.status"
                    ></app-status-badge>
                    <span class="checklist-pending" *ngIf="!documentFor(req.type)">Not uploaded yet</span>
                  </div>
                  <div class="checklist-sub" *ngIf="documentFor(req.type) as doc">
                    <span class="checklist-filename">{{ doc.fileName }}</span>
                    <span class="checklist-date">{{ doc.uploadedAt | date: 'mediumDate' }}</span>
                  </div>
                  <div class="checklist-remarks" *ngIf="documentFor(req.type)?.remarks as remarks">
                    {{ remarks }}
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="upload-card" *ngIf="bgv.status === 'DOCUMENTS_PENDING'">
          <mat-card-header>
            <mat-card-title>Upload a Document</mat-card-title>
          </mat-card-header>
          <mat-card-content class="upload-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Document Type</mat-label>
              <mat-select [(ngModel)]="documentType">
                <mat-option *ngFor="let req of requiredDocTypes" [value]="req.type">{{ req.label }}</mat-option>
                <mat-option value="OTHER">Other</mat-option>
              </mat-select>
            </mat-form-field>

            <div class="dropzone" [class.has-file]="selectedFile" (click)="fileInput.click()">
              <input type="file" hidden #fileInput (change)="onFileSelected($event)" />
              <mat-icon>{{ selectedFile ? 'insert_drive_file' : 'cloud_upload' }}</mat-icon>
              <span>{{ selectedFile ? selectedFile.name : 'Click to choose a file' }}</span>
              <span class="dropzone-hint" *ngIf="!selectedFile">PDF, JPG or PNG — up to 10MB</span>
            </div>

            <button mat-raised-button color="primary" class="upload-btn" [disabled]="!selectedFile || uploading" (click)="upload()">
              <mat-icon>{{ uploading ? 'hourglass_top' : 'upload' }}</mat-icon>
              {{ uploading ? 'Uploading…' : 'Upload Document' }}
            </button>

            <div class="submit-row">
              <button
                mat-raised-button
                color="accent"
                class="submit-btn"
                [disabled]="!allRequiredUploaded() || submitting"
                (click)="submitDocuments()"
              >
                <mat-icon>{{ submitting ? 'hourglass_top' : 'lock' }}</mat-icon>
                {{ submitting ? 'Submitting…' : 'Submit Background Check Documents' }}
              </button>
              <span class="submit-hint" *ngIf="!allRequiredUploaded()">
                Upload all {{ requiredDocTypes.length }} required documents to enable submission.
              </span>
              <span class="submit-hint" *ngIf="allRequiredUploaded()">
                Once submitted, documents can no longer be edited or replaced.
              </span>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="locked-banner" *ngIf="bgv.status !== 'DOCUMENTS_PENDING'">
          <mat-icon>lock</mat-icon>
          <span>Background check documents have already been submitted and cannot be modified.</span>
        </div>

        <mat-card class="docs-card">
          <mat-card-header>
            <mat-card-title>Your Documents</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state *ngIf="documents.length === 0" icon="description" title="No documents uploaded yet"></app-empty-state>
            <div class="doc-row" *ngFor="let doc of documents" [ngClass]="docAccentClass(doc)">
              <mat-icon class="doc-icon">{{ docTypeIcon(doc.documentType) }}</mat-icon>
              <div class="doc-info">
                <span class="doc-type">{{ docTypeLabel(doc.documentType) }}</span>
                <span class="doc-file">{{ doc.fileName }} · {{ doc.uploadedAt | date: 'mediumDate' }}</span>
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
      .hero-card,
      .checklist-card,
      .upload-card,
      .docs-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        overflow: hidden;
      }

      /* Hero */
      .hero-card {
        border-left: 5px solid #94a3b8;
      }
      .hero-card.accent-warning { border-left-color: #eab308; }
      .hero-card.accent-info { border-left-color: #3b82f6; }
      .hero-card.accent-success { border-left-color: #16a34a; }
      .hero-card.accent-danger { border-left-color: #dc2626; }
      .hero-row {
        display: flex;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
        padding: 6px 4px;
      }
      .hero-icon {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: #f1f5f9;
        color: #64748b;
      }
      .hero-icon mat-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }
      .hero-icon.accent-warning { background: #fef9c3; color: #a16207; }
      .hero-icon.accent-info { background: #dbeafe; color: #1d4ed8; }
      .hero-icon.accent-success { background: #dcfce7; color: #15803d; }
      .hero-icon.accent-danger { background: #fee2e2; color: #dc2626; }
      .hero-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex: 1;
        min-width: 220px;
      }
      .hero-eyebrow {
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .hero-desc {
        margin: 0;
        font-size: 13px;
        color: #64748b;
      }

      /* Checklist — NextStep-style vertical timeline */
      .checklist {
        display: flex;
        flex-direction: column;
      }
      .checklist-row {
        display: flex;
        gap: 16px;
      }
      .checklist-marker {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 36px;
        flex-shrink: 0;
      }
      .checklist-dot {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        color: #94a3b8;
        border: 2px solid #e2e8f0;
        flex-shrink: 0;
      }
      .checklist-dot mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .checklist-dot.dot-done {
        background: #16a34a;
        color: white;
        border-color: #16a34a;
      }
      .checklist-dot.dot-pending {
        background: #fef9c3;
        color: #a16207;
        border-color: #fde68a;
      }
      .checklist-dot.dot-rejected {
        background: #fee2e2;
        color: #dc2626;
        border-color: #fecaca;
      }
      .checklist-line {
        width: 2px;
        flex: 1;
        min-height: 24px;
        background: #e2e8f0;
        margin-top: 2px;
      }
      .checklist-card-inner {
        flex: 1;
        border: 1px solid #f1f5f9;
        border-radius: 10px;
        padding: 12px 16px;
        margin-bottom: 16px;
        background: #fafbfc;
      }
      .checklist-heading {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .checklist-type-icon {
        color: #64748b;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .checklist-label {
        font-weight: 600;
        color: #1e293b;
        font-size: 14px;
        margin-right: auto;
      }
      .checklist-pending {
        font-size: 12px;
        color: #94a3b8;
        font-style: italic;
      }
      .checklist-sub {
        display: flex;
        gap: 10px;
        margin-top: 4px;
        font-size: 12px;
        color: #64748b;
      }
      .checklist-remarks {
        margin-top: 6px;
        font-size: 12px;
        color: #c2410c;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        border-radius: 6px;
        padding: 6px 10px;
      }

      /* Upload */
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
        gap: 6px;
        transition: all 0.2s;
      }
      .dropzone:hover {
        border-color: var(--brand-400);
        background: var(--brand-100);
      }
      .dropzone.has-file {
        border-style: solid;
        border-color: var(--brand-400);
        background: var(--brand-100);
        color: var(--brand-700);
      }
      .dropzone-hint {
        font-size: 11px;
        color: #94a3b8;
      }
      .upload-btn {
        align-self: flex-start;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .submit-row {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
        margin-top: 8px;
        padding-top: 16px;
        border-top: 1px solid #f1f5f9;
      }
      .submit-btn {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .submit-hint {
        font-size: 12px;
        color: #64748b;
      }
      .locked-banner {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        border-radius: 10px;
        background: #f1f5f9;
        color: #475569;
        font-size: 13px;
        font-weight: 500;
      }
      .locked-banner mat-icon {
        color: #94a3b8;
      }

      /* Documents list */
      .doc-row {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #94a3b8;
        border-radius: 8px;
        margin-bottom: 10px;
      }
      .doc-row.accent-success { border-left-color: #16a34a; }
      .doc-row.accent-warning { border-left-color: #eab308; }
      .doc-row.accent-danger { border-left-color: #dc2626; }
      .doc-icon {
        color: #64748b;
        flex-shrink: 0;
      }
      .doc-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }
      .doc-type {
        font-weight: 600;
        font-size: 13px;
        color: #1e293b;
      }
      .doc-file {
        font-size: 12px;
        color: #64748b;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .doc-status {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        flex-shrink: 0;
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
  submitting = false;

  readonly requiredDocTypes: RequiredDocType[] = [
    { type: 'GOVT_ID', label: 'Government ID', icon: 'badge' },
    { type: 'ADDRESS_PROOF', label: 'Address Proof', icon: 'home' },
    { type: 'EDUCATION_CERTIFICATE', label: 'Education Certificate', icon: 'school' },
    { type: 'PREVIOUS_EMPLOYMENT_PROOF', label: 'Previous Employment Proof', icon: 'work' },
    { type: 'PHOTO', label: 'Photograph', icon: 'account_circle' },
  ];

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
      error: () => {
        this.uploading = false;
      },
    });
  }

  /** Latest uploaded document of a given required type, if any (a re-upload replaces the one
   *  shown on the checklist row with whichever the backend returns last in the list). */
  documentFor(type: string): BgcDocument | undefined {
    return this.documents.find((d) => d.documentType === type);
  }

  allRequiredUploaded(): boolean {
    return this.requiredDocTypes.every((req) => !!this.documentFor(req.type));
  }

  submitDocuments(): void {
    if (!this.applicationId || !this.allRequiredUploaded() || this.submitting) return;
    this.submitting = true;
    this.bgvService.submitDocuments(this.applicationId).subscribe({
      next: () => {
        this.submitting = false;
        this.toastService.success('Documents submitted for review. They are now locked and can no longer be edited.');
        this.loadCase();
      },
      error: () => {
        this.submitting = false;
      },
    });
  }

  docTypeLabel(type: string): string {
    return this.requiredDocTypes.find((r) => r.type === type)?.label ?? 'Other Document';
  }

  docTypeIcon(type: string): string {
    return this.requiredDocTypes.find((r) => r.type === type)?.icon ?? 'insert_drive_file';
  }

  checklistIcon(type: string): string {
    const doc = this.documentFor(type);
    if (!doc) return 'radio_button_unchecked';
    if (doc.status === 'ACCEPTED') return 'check';
    if (doc.status === 'REJECTED' || doc.status === 'REUPLOAD_REQUIRED') return 'priority_high';
    return 'schedule';
  }

  checklistDotClass(type: string): string {
    const doc = this.documentFor(type);
    if (!doc) return '';
    if (doc.status === 'ACCEPTED') return 'dot-done';
    if (doc.status === 'REJECTED' || doc.status === 'REUPLOAD_REQUIRED') return 'dot-rejected';
    return 'dot-pending';
  }

  docAccentClass(doc: BgcDocument): string {
    if (doc.status === 'ACCEPTED') return 'accent-success';
    if (doc.status === 'REJECTED' || doc.status === 'REUPLOAD_REQUIRED') return 'accent-danger';
    return 'accent-warning';
  }

  statusIcon(): string {
    switch (this.bgv?.status as BgvStatus) {
      case 'CLEARED':
        return 'verified';
      case 'FAILED':
        return 'cancel';
      case 'VERIFICATION_IN_PROGRESS':
        return 'autorenew';
      case 'RECHECK_REQUIRED':
        return 'priority_high';
      case 'ON_HOLD':
        return 'pause_circle';
      case 'DOCUMENTS_SUBMITTED':
        return 'task_alt';
      default:
        return 'schedule';
    }
  }

  statusAccentClass(): string {
    switch (this.bgv?.status as BgvStatus) {
      case 'CLEARED':
        return 'accent-success';
      case 'FAILED':
      case 'RECHECK_REQUIRED':
        return 'accent-danger';
      case 'VERIFICATION_IN_PROGRESS':
      case 'DOCUMENTS_SUBMITTED':
        return 'accent-info';
      default:
        return 'accent-warning';
    }
  }

  statusDescription(): string {
    switch (this.bgv?.status as BgvStatus) {
      case 'DOCUMENTS_PENDING':
        return 'Please upload the documents listed below to continue.';
      case 'DOCUMENTS_SUBMITTED':
        return 'Your documents were submitted and are queued for verification.';
      case 'VERIFICATION_IN_PROGRESS':
        return 'Our team is verifying your documents. This usually takes a few days.';
      case 'CLEARED':
        return 'Your background verification is complete. You are all set!';
      case 'FAILED':
        return 'Your background verification could not be completed. Contact HR for details.';
      case 'RECHECK_REQUIRED':
        return 'Some documents need to be re-checked. Please review the remarks below.';
      case 'ON_HOLD':
        return 'Your background verification is currently on hold.';
      default:
        return 'Background verification has been initiated.';
    }
  }
}
