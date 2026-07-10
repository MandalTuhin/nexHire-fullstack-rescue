import { Component, OnInit } from '@angular/core';
import { OfferLetterService } from '../../../services/offer-letter.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { ToastService } from '../../../shared/services/toast.service';
import { OfferLetter } from '../../../models/offer-letter.model';

@Component({
  selector: 'app-candidate-offers',
  template: `
    <div class="candidate-offers">
      <app-page-header title="My Offers" subtitle="Review, download and respond to your offer letters"></app-page-header>

      <app-empty-state *ngIf="offers.length === 0" icon="mail" title="No offers found" subtitle="Offers are generated automatically once you pass the assessment stage."></app-empty-state>

      <div class="offers-grid" *ngIf="offers.length > 0">
        <mat-card class="offer-card" *ngFor="let offer of offers">
          <mat-card-header>
            <mat-icon mat-card-avatar class="offer-icon">verified</mat-icon>
            <mat-card-title>{{ offer.jobTitle }}</mat-card-title>
            <mat-card-subtitle *ngIf="offer.generatedAt">Generated {{ offer.generatedAt | date: 'mediumDate' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content class="offer-details">
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">Status</span>
                <div class="value">
                  <app-status-badge [status]="offer.status"></app-status-badge>
                </div>
              </div>
              <div class="detail-item" *ngIf="offer.sentAt">
                <span class="label">Sent On</span>
                <span class="value">{{ offer.sentAt | date: 'mediumDate' }}</span>
              </div>
              <div class="detail-item" *ngIf="offer.respondedAt">
                <span class="label">Responded On</span>
                <span class="value">{{ offer.respondedAt | date: 'mediumDate' }}</span>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions class="offer-actions">
            <button mat-stroked-button color="primary" [disabled]="!offer.pdfFileId" (click)="viewPdf(offer)">
              <mat-icon>picture_as_pdf</mat-icon> View / Download PDF
            </button>
            <ng-container *ngIf="offer.status === 'SENT'">
              <button mat-raised-button color="primary" (click)="accept(offer.offerId)">Accept Offer</button>
              <button mat-stroked-button color="warn" (click)="reject(offer.offerId)">Reject Offer</button>
            </ng-container>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .candidate-offers {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .offers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
        gap: 24px;
      }
      .offer-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
      }
      .offer-icon {
        color: #3f51b5;
        font-size: 40px;
        width: 40px;
        height: 40px;
        margin-right: 12px;
      }
      .offer-details {
        margin: 20px 0;
      }
      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
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
      .offer-actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: flex-end;
        padding-top: 16px !important;
        border-top: 1px solid #f1f5f9;
      }
    `,
  ],
  standalone: false,
})
export class CandidateOffersComponent implements OnInit {
  offers: OfferLetter[] = [];

  constructor(
    private offerService: OfferLetterService,
    private currentUserService: CurrentUserService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    const user = this.currentUserService.getUser();
    if (user?.userId) {
      this.offerService.getByUser(user.userId).subscribe((offs) => (this.offers = offs));
    }
  }

  viewPdf(offer: OfferLetter): void {
    this.offerService.downloadPdf(offer.offerId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => this.toastService.error('Unable to load offer letter PDF.'),
    });
  }

  accept(id: number): void {
    this.offerService.updateStatus(id, 'ACCEPTED').subscribe({
      next: () => {
        this.toastService.success('Offer accepted! Background verification will begin shortly.');
        this.ngOnInit();
      },
      error: (e) => this.toastService.error(e.error?.message || 'Action failed'),
    });
  }

  reject(id: number): void {
    this.offerService.updateStatus(id, 'REJECTED').subscribe({
      next: () => {
        this.toastService.success('Offer rejected.');
        this.ngOnInit();
      },
      error: (e) => this.toastService.error(e.error?.message || 'Action failed'),
    });
  }
}
