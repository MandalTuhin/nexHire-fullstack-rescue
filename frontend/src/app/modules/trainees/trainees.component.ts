import { Component, OnInit } from '@angular/core';
import {
  TraineeProgressService,
  TraineeRecord,
} from '../../services/trainee-progress.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-trainees-mgmt',
  template: `
    <div class="trainees-mgmt">
      <app-page-header
        title="Trainee Batches"
        subtitle="Track progress and graduate trainees to project-ready state"
      ></app-page-header>

      <mat-card class="table-card">
        <mat-card-content>
          <app-empty-state
            *ngIf="trainees.length === 0"
            icon="school"
            title="No active trainees"
            subtitle="Candidates who accept their joining letter appear here."
          ></app-empty-state>

          <div class="table-container" *ngIf="trainees.length > 0">
            <table mat-table [dataSource]="trainees">
              <ng-container matColumnDef="candidate">
                <th mat-header-cell *matHeaderCellDef>Candidate</th>
                <td mat-cell *matCellDef="let t">
                  <div class="candidate-meta">
                    <span class="name">{{ t.candidateName }}</span>
                    <span class="email">{{ t.candidateEmail }}</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="job">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let t">{{ t.jobTitle }}</td>
              </ng-container>

              <ng-container matColumnDef="progress">
                <th mat-header-cell *matHeaderCellDef>Progress</th>
                <td mat-cell *matCellDef="let t">
                  <div class="progress-cell">
                    <mat-progress-bar
                      mode="determinate"
                      [value]="t.progress"
                      class="progress-bar"
                    ></mat-progress-bar>
                    <span class="pct-text">{{ t.progress }}%</span>
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let t">
                  <app-status-badge
                    [status]="t.applicationStatus"
                  ></app-status-badge>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef align="end">Actions</th>
                <td mat-cell *matCellDef="let t" align="end">
                  <ng-container
                    *ngIf="
                      !t.completed &&
                      t.applicationStatus === 'TRAINING_IN_PROGRESS'
                    "
                  >
                    <button
                      mat-stroked-button
                      class="row-btn"
                      (click)="bumpProgress(t)"
                    >
                      +15% Progress
                    </button>
                    <button
                      mat-flat-button
                      color="primary"
                      class="row-btn"
                      [disabled]="t.progress < 100"
                      (click)="graduate(t)"
                    >
                      Graduate
                    </button>
                  </ng-container>
                  <span
                    *ngIf="t.applicationStatus === 'TRAINING_COMPLETED'"
                    class="completed-label"
                    >Graduated</span
                  >
                  <span
                    *ngIf="t.applicationStatus === 'PROJECT_ASSIGNED'"
                    class="completed-label"
                    >Project Assigned</span
                  >
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
      .trainees-mgmt {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .table-card {
        border-radius: 12px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04) !important;
      }
      table {
        width: 100%;
      }
      .candidate-meta {
        display: flex;
        flex-direction: column;
      }
      .candidate-meta .name {
        font-weight: 600;
        color: #1e293b;
      }
      .candidate-meta .email {
        font-size: 11px;
        color: #64748b;
      }
      .progress-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 140px;
      }
      .progress-bar {
        height: 6px !important;
        border-radius: 4px;
        flex-grow: 1;
      }
      .pct-text {
        font-size: 12px;
        font-weight: 600;
        color: #475569;
      }
      .row-btn {
        margin-left: 8px;
        height: 32px;
        line-height: 32px;
        font-size: 13px;
      }
      .completed-label {
        font-size: 12px;
        color: #16a34a;
        font-weight: 600;
      }
    `,
  ],
  standalone: false,
})
export class TraineesManagementComponent implements OnInit {
  trainees: TraineeRecord[] = [];
  displayedColumns = ['candidate', 'job', 'progress', 'status', 'actions'];

  constructor(
    private trainingService: TraineeProgressService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.trainingService
      .getAllTrainees()
      .subscribe((list) => (this.trainees = list));
  }

  bumpProgress(t: TraineeRecord): void {
    const next = Math.min((t.progress || 0) + 15, 100);
    this.trainingService.updateProgress(t.traineeId, next).subscribe({
      next: () => {
        this.toast.success(`Progress updated to ${next}%`);
        this.load();
      },
      error: (e) =>
        this.toast.error(e.error?.message || 'Failed to update progress'),
    });
  }

  graduate(t: TraineeRecord): void {
    this.trainingService.complete(t.traineeId).subscribe({
      next: () => {
        this.toast.success('Trainee graduated (TRAINING_COMPLETED)');
        this.load();
      },
      error: (e) =>
        this.toast.error(e.error?.message || 'Failed to complete training'),
    });
  }
}
