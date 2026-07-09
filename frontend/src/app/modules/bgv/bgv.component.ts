import { Component, OnInit } from '@angular/core';
import { BackgroundVerificationService } from '../../services/background-verification.service';
import { ToastService } from '../../shared/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { BackgroundVerification, BgvStatus } from '../../models/background-verification.model';

@Component({
    selector: 'app-bgv-mgmt',
    template: `
    <div class="bgv-mgmt">
      <app-page-header title="Background Verification" subtitle="Perform address, education, and previous employment verification checks"></app-page-header>

      <mat-card class="table-card">
        <mat-card-content>
          <app-empty-state *ngIf="verifications.length === 0" icon="verified" title="No background checks pending" subtitle="Acceptance of offer letters initiates BGV."></app-empty-state>

          <div class="table-container" *ngIf="verifications.length > 0">
            <table mat-table [dataSource]="verifications">
              <!-- Candidate -->
              <ng-container matColumnDef="candidate">
                <th mat-header-cell *matHeaderCellDef>Candidate</th>
                <td mat-cell *matCellDef="let bgv">
                  <div class="candidate-info">
                    <span class="name">{{ bgv.candidateName }}</span>
                    <span class="email">{{ bgv.candidateEmail }}</span>
                  </div>
                </td>
              </ng-container>

              <!-- Initiated Date -->
              <ng-container matColumnDef="initiatedDate">
                <th mat-header-cell *matHeaderCellDef>Initiated Date</th>
                <td mat-cell *matCellDef="let bgv">{{ bgv.initiatedDate | date }}</td>
              </ng-container>

              <!-- Status -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let bgv">
                  <app-status-badge [status]="bgv.status"></app-status-badge>
                </td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef align="end">Verification Actions</th>
                <td mat-cell *matCellDef="let bgv" align="end">
                  <ng-container *ngIf="bgv.status === 'PENDING' || bgv.status === 'IN_PROGRESS'">
                    <button mat-flat-button color="primary" class="row-btn" (click)="transitionBgv(bgv.bgvId, 'CLEARED')">Clear Candidate</button>
                    <button mat-stroked-button color="warn" class="row-btn" (click)="transitionBgv(bgv.bgvId, 'FAILED')">Mark Failed</button>
                  </ng-container>
                  <span *ngIf="bgv.status === 'CLEARED'" class="success-label">Verification Complete</span>
                  <span *ngIf="bgv.status === 'FAILED'" class="failed-label">Candidate Rejected</span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .bgv-mgmt {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .table-card {
      border-radius: 12px !important;
      box-shadow: 0 4px 20px rgba(0,0,0,0.04) !important;
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
      margin-left: 8px;
      height: 32px;
      line-height: 32px;
      font-size: 13px;
    }
    .success-label {
      font-size: 12px;
      color: #16a34a;
      font-weight: 600;
    }
    .failed-label {
      font-size: 12px;
      color: #dc2626;
      font-weight: 600;
    }
  `],
    standalone: false
})
export class BgvManagementComponent implements OnInit {
  verifications: BackgroundVerification[] = [];
  displayedColumns = ['candidate', 'initiatedDate', 'status', 'actions'];

  constructor(
    private bgvService: BackgroundVerificationService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadBgvList();
  }

  loadBgvList(): void {
    this.bgvService.getAll().subscribe(list => this.verifications = list);
  }

  transitionBgv(id: number, status: BgvStatus): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Verification Result',
        message: status === 'CLEARED'
          ? 'Clearing the verification creates an employee profile and flags the candidate for training batches. Continue?'
          : 'Are you sure you want to mark this verification as failed?',
        type: status === 'CLEARED' ? 'info' : 'danger'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.bgvService.updateStatus(id, { status }).subscribe({
          next: () => {
            this.toastService.success(`Background verification result saved: ${status}`);
            this.loadBgvList();
          },
          error: () => this.toastService.error('BGV transition update failed.')
        });
      }
    });
  }
}
