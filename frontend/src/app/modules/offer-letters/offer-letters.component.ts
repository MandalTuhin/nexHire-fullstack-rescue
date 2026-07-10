import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { OfferLetterService } from '../../services/offer-letter.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { BulkAction } from '../../shared/components/bulk-action-bar/bulk-action-bar.component';
import { OfferLetter } from '../../models/offer-letter.model';
import { ApplicationBulkActionResult } from '../../models/application.model';

@Component({
  selector: 'app-offer-letters-mgmt',
  template: `
    <div class="offer-letters-mgmt">
      <app-page-header
        title="Offer Letters"
        subtitle="Offers are auto-generated for passed candidates — review, sort by score, and send"
      ></app-page-header>

      <mat-card class="filter-card">
        <mat-card-content class="filter-row">
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Search candidate</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="applyFilters()" placeholder="Name or email" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
              <mat-option value="">All</mat-option>
              <mat-option value="GENERATED">Generated (not sent)</mat-option>
              <mat-option value="SENT">Sent</mat-option>
              <mat-option value="ACCEPTED">Accepted</mat-option>
              <mat-option value="REJECTED">Rejected</mat-option>
            </mat-select>
          </mat-form-field>

          <div class="select-shortcuts">
            <button mat-stroked-button (click)="selectTop(30)">Select Top 30</button>
            <button mat-stroked-button (click)="selectTop(60)">Select Top 60</button>
            <button mat-stroked-button (click)="selectAllVisible()">Select All Visible</button>
          </div>
        </mat-card-content>
      </mat-card>

      <app-bulk-action-bar
        [selectedCount]="selected.size"
        [actions]="bulkActions"
        (actionClicked)="onBulkAction($event)"
        (selectionCleared)="selected.clear()"
      ></app-bulk-action-bar>

      <mat-card class="table-card">
        <mat-card-content>
          <app-empty-state
            *ngIf="!loading && filteredOffers.length === 0"
            icon="mail"
            title="No offer letters"
            subtitle="Offers are generated automatically once candidates pass their assessment."
          ></app-empty-state>

          <app-loader *ngIf="loading"></app-loader>

          <div class="table-container" *ngIf="!loading && filteredOffers.length > 0">
            <table mat-table [dataSource]="filteredOffers">
              <ng-container matColumnDef="select">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let offer">
                  <mat-checkbox
                    [checked]="selected.has(offer.applicationId)"
                    [disabled]="offer.status !== 'GENERATED'"
                    (change)="toggle(offer.applicationId)"
                  ></mat-checkbox>
                </td>
              </ng-container>

              <ng-container matColumnDef="candidate">
                <th mat-header-cell *matHeaderCellDef>Candidate</th>
                <td mat-cell *matCellDef="let offer">
                  <div class="candidate-info">
                    <span class="name">{{ offer.candidateName }}</span>
                    <span class="email">{{ offer.candidateEmail }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="jobTitle">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let offer">{{ offer.jobTitle }}</td>
              </ng-container>

              <ng-container matColumnDef="score">
                <th mat-header-cell *matHeaderCellDef>Score</th>
                <td mat-cell *matCellDef="let offer">{{ offer.assessmentScore ?? '—' }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let offer">
                  <app-status-badge [status]="offer.status"></app-status-badge>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef align="end">Actions</th>
                <td mat-cell *matCellDef="let offer" align="end">
                  <button mat-icon-button matTooltip="View PDF" [disabled]="!offer.pdfFileId" (click)="viewPdf(offer)">
                    <mat-icon>picture_as_pdf</mat-icon>
                  </button>
                  <button
                    *ngIf="offer.status === 'GENERATED'"
                    mat-flat-button
                    color="primary"
                    class="row-btn"
                    (click)="sendOne(offer)"
                  >
                    Send
                  </button>
                  <span *ngIf="offer.status !== 'GENERATED'" class="status-done">{{ offer.status | titlecase }}</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .offer-letters-mgmt {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
      }
      .filter-card,
      .table-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }
      .filter-row {
        display: flex;
        gap: 16px;
        padding: 4px 0;
        flex-wrap: wrap;
        align-items: center;
      }
      .filter-item {
        flex: 1;
        min-width: 220px;
      }
      .select-shortcuts {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      table {
        width: 100%;
      }
      .candidate-info {
        display: flex;
        flex-direction: column;
      }
      .candidate-info .name {
        font-weight: 600;
        color: #1e293b;
      }
      .candidate-info .email {
        font-size: 11px;
        color: #64748b;
      }
      .row-btn {
        height: 32px;
        line-height: 32px;
        font-size: 13px;
        margin-left: 4px;
      }
      .status-done {
        font-size: 12px;
        color: #94a3b8;
        font-weight: 500;
      }
    `,
  ],
  standalone: false,
})
export class OfferLettersManagementComponent implements OnInit {
  offers: OfferLetter[] = [];
  filteredOffers: OfferLetter[] = [];
  displayedColumns = ['select', 'candidate', 'jobTitle', 'score', 'status', 'actions'];
  loading = false;

  search = '';
  statusFilter = '';
  selected = new Set<number>();

  readonly bulkActions: BulkAction[] = [
    { id: 'bulk-send', label: 'Bulk Send Offers', icon: 'send', color: 'primary' },
  ];

  constructor(
    private offerService: OfferLetterService,
    private toastService: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadOffers();
  }

  loadOffers(): void {
    this.loading = true;
    this.offerService.getAll().subscribe({
      next: (offs) => {
        this.offers = offs;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Failed to load offers.');
      },
    });
  }

  applyFilters(): void {
    const s = this.search.trim().toLowerCase();
    this.filteredOffers = this.offers.filter((o) => {
      const matchesSearch =
        !s ||
        (o.candidateName || '').toLowerCase().includes(s) ||
        (o.candidateEmail || '').toLowerCase().includes(s);
      const matchesStatus = !this.statusFilter || o.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
    // Drop selections that fell out of view.
    const visibleIds = new Set(this.filteredOffers.map((o) => o.applicationId));
    for (const id of Array.from(this.selected)) {
      if (!visibleIds.has(id)) this.selected.delete(id);
    }
  }

  toggle(applicationId: number): void {
    if (this.selected.has(applicationId)) {
      this.selected.delete(applicationId);
    } else {
      this.selected.add(applicationId);
    }
  }

  selectTop(n: number): void {
    this.selected.clear();
    this.filteredOffers
      .filter((o) => o.status === 'GENERATED')
      .slice(0, n)
      .forEach((o) => this.selected.add(o.applicationId));
  }

  selectAllVisible(): void {
    this.selected.clear();
    this.filteredOffers.filter((o) => o.status === 'GENERATED').forEach((o) => this.selected.add(o.applicationId));
  }

  viewPdf(offer: OfferLetter): void {
    this.offerService.downloadPdf(offer.offerId).subscribe({
      next: (blob) => window.open(window.URL.createObjectURL(blob), '_blank'),
      error: () => this.toastService.error('Unable to load offer letter PDF.'),
    });
  }

  sendOne(offer: OfferLetter): void {
    const ref = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Send Offer',
        message: `Send the offer letter to ${offer.candidateName}?`,
        type: 'info',
        confirmText: 'Send',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.offerService.sendOffer(offer.applicationId).subscribe({
        next: () => {
          this.toastService.success('Offer sent.');
          this.loadOffers();
        },
        error: (e) => this.toastService.error(e.error?.message || 'Failed to send offer'),
      });
    });
  }

  onBulkAction(actionId: string): void {
    if (actionId === 'bulk-send') {
      this.bulkSend();
    }
  }

  bulkSend(): void {
    const ids = Array.from(this.selected);
    const ref = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Bulk Send Offers',
        message: `Send offer letters to ${ids.length} selected candidate(s)?`,
        type: 'info',
        confirmText: 'Send All',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.offerService.bulkSend(ids).subscribe({
        next: (result: ApplicationBulkActionResult) => {
          this.selected.clear();
          this.loadOffers();
          if (result.failureCount === 0) {
            this.toastService.success(`${result.successCount} offer(s) sent successfully.`);
          } else {
            this.toastService.warning(
              `${result.successCount} sent, ${result.failureCount} failed.`,
            );
          }
        },
        error: (e) => this.toastService.error(e.error?.message || 'Bulk send failed'),
      });
    });
  }
}
