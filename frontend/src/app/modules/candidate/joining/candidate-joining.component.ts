import { Component, OnInit } from '@angular/core';
import { JoiningLetterService } from '../../../services/joining-letter.service';
import { ToastService } from '../../../shared/services/toast.service';
import { JoiningLetter } from '../../../models/joining-letter.model';

@Component({
  selector: 'app-candidate-joining',
  template: `
    <div class="candidate-joining">
      <app-page-header
        title="Joining Letters"
        subtitle="Review your joining letter and confirm your onboarding"
      ></app-page-header>

      <app-empty-state
        *ngIf="letters.length === 0"
        icon="how_to_reg"
        title="No joining letters yet"
        subtitle="Once HR creates your joining batch and issues letters, they'll appear here."
      ></app-empty-state>

      <div class="letters-grid" *ngIf="letters.length > 0">
        <mat-card class="letter-card" *ngFor="let letter of letters">
          <mat-card-header>
            <mat-icon mat-card-avatar class="letter-icon">how_to_reg</mat-icon>
            <mat-card-title>{{ letter.jobTitle }}</mat-card-title>
            <mat-card-subtitle
              >Location: {{ letter.locationName }}<span *ngIf="letter.batchCode"> · Batch {{ letter.batchCode }}</span></mat-card-subtitle
            >
          </mat-card-header>
          <mat-card-content>
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">Joining Date</span>
                <span class="value">{{
                  letter.joiningDate | date: 'mediumDate'
                }}</span>
              </div>
              <div class="detail-item" *ngIf="letter.employeeCode">
                <span class="label">Employee ID</span>
                <span class="value">{{ letter.employeeCode }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Status</span>
                <div class="value">
                  <app-status-badge [status]="letter.status"></app-status-badge>
                </div>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions class="letter-actions">
            <button mat-stroked-button color="primary" [disabled]="!letter.pdfFileId" (click)="viewPdf(letter)">
              <mat-icon>picture_as_pdf</mat-icon> View PDF
            </button>
            <ng-container *ngIf="letter.status === 'JOINING_LETTER_SENT'">
              <button mat-raised-button color="primary" (click)="accept(letter.id)">
                Accept & Join
              </button>
              <button mat-stroked-button color="warn" (click)="reject(letter.id)">
                Decline
              </button>
            </ng-container>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .candidate-joining {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .letters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
        gap: 24px;
      }
      .letter-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
      }
      .letter-icon {
        color: #4f46e5;
      }
      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin: 12px 0;
      }
      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .detail-item .label {
        font-size: 12px;
        color: #64748b;
        font-weight: 500;
      }
      .detail-item .value {
        font-size: 15px;
        font-weight: 600;
        color: #1e293b;
      }
      .letter-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
        padding-top: 12px !important;
        border-top: 1px solid #f1f5f9;
      }
    `,
  ],
  standalone: false,
})
export class CandidateJoiningComponent implements OnInit {
  letters: JoiningLetter[] = [];

  constructor(
    private joiningService: JoiningLetterService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.joiningService.getMine().subscribe((letters) => (this.letters = letters));
  }

  viewPdf(letter: JoiningLetter): void {
    this.joiningService.downloadPdf(letter.id).subscribe({
      next: (blob) => window.open(window.URL.createObjectURL(blob), '_blank'),
      error: () => this.toast.error('Unable to load joining letter PDF.'),
    });
  }

  accept(id: number): void {
    this.joiningService.accept(id).subscribe({
      next: () => {
        this.toast.success('Joining accepted! HR will confirm your training assignment soon.');
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to accept joining letter'),
    });
  }

  reject(id: number): void {
    this.joiningService.reject(id).subscribe({
      next: () => {
        this.toast.success('Joining letter declined.');
        this.load();
      },
      error: (err) => this.toast.error(err.error?.message || 'Failed to decline joining letter'),
    });
  }
}
