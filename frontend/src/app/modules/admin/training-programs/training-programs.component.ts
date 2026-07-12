import { Component, OnInit } from '@angular/core';
import { TrainingBatchService } from '../../../services/training-batch.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TrainingProgram, TrainingProgramStatus } from '../../../models/training-batch.model';

/**
 * Admin Training Program master (P-Claude.md "TRAINING PROGRAMS": Admin-managed catalog —
 * Java/Angular/Python/Cloud etc. — that HR selects from while creating joining batches).
 */
@Component({
  selector: 'app-training-programs',
  template: `
    <div class="training-programs-page">
      <app-page-header
        title="Training Programs"
        subtitle="Manage the training program catalog HR selects from when creating batches."
      ></app-page-header>

      <div class="programs-grid">
        <mat-card class="panel-card">
          <mat-card-header>
            <mat-card-title>{{ editingId ? 'Edit Program' : 'Create New Program' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-columns">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Program Name</mat-label>
                <input matInput [(ngModel)]="form.name" placeholder="e.g. Java" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Duration</mat-label>
                <input matInput [(ngModel)]="form.duration" placeholder="e.g. 8 weeks" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Cost Per Trainee (₹)</mat-label>
                <input matInput type="number" [(ngModel)]="form.costPerCandidate" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Cutoff Score</mat-label>
                <input matInput type="number" [(ngModel)]="form.cutoffScore" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Minimum Attendance (%)</mat-label>
                <input matInput type="number" [(ngModel)]="form.minimumAttendancePercentage" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width" *ngIf="editingId">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="form.status">
                  <mat-option value="ACTIVE">Active</mat-option>
                  <mat-option value="INACTIVE">Inactive</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-raised-button color="primary" class="save-btn" [disabled]="saving" (click)="save()">
                {{ editingId ? 'Save Changes' : 'Create Program' }}
              </button>
              <button *ngIf="editingId" mat-stroked-button class="save-btn" [disabled]="saving" (click)="cancelEdit()">
                Cancel
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="panel-card table-panel">
          <mat-card-header>
            <mat-card-title>All Programs</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state
              *ngIf="programs.length === 0"
              icon="school"
              title="No training programs found"
              subtitle="Create a program to get started."
            ></app-empty-state>

            <div class="table-container" *ngIf="programs.length > 0">
              <table mat-table [dataSource]="programs">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Program</th>
                  <td mat-cell *matCellDef="let p">{{ p.name }}</td>
                </ng-container>

                <ng-container matColumnDef="duration">
                  <th mat-header-cell *matHeaderCellDef>Duration</th>
                  <td mat-cell *matCellDef="let p">{{ p.duration || '—' }}</td>
                </ng-container>

                <ng-container matColumnDef="cost">
                  <th mat-header-cell *matHeaderCellDef>Cost/Trainee</th>
                  <td mat-cell *matCellDef="let p">₹{{ p.costPerCandidate | number }}</td>
                </ng-container>

                <ng-container matColumnDef="cutoff">
                  <th mat-header-cell *matHeaderCellDef>Cutoff</th>
                  <td mat-cell *matCellDef="let p">{{ p.cutoffScore }}</td>
                </ng-container>

                <ng-container matColumnDef="attendance">
                  <th mat-header-cell *matHeaderCellDef>Min. Attendance</th>
                  <td mat-cell *matCellDef="let p">{{ p.minimumAttendancePercentage }}%</td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let p">
                    <span class="status-chip" [class.active]="p.status === 'ACTIVE'" [class.inactive]="p.status !== 'ACTIVE'">
                      {{ p.status }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef align="end">Actions</th>
                  <td mat-cell *matCellDef="let p" align="end">
                    <button mat-icon-button color="primary" matTooltip="Edit" (click)="edit(p)">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .training-programs-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .programs-grid {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 24px;
      }
      @media (max-width: 992px) {
        .programs-grid {
          grid-template-columns: 1fr;
        }
      }
      .panel-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
      }
      .form-columns {
        display: grid;
        gap: 16px;
      }
      .full-width {
        width: 100%;
      }
      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
      }
      .table-panel {
        display: flex;
        flex-direction: column;
      }
      .table-container {
        margin-top: 16px;
        width: 100%;
        overflow-x: auto;
      }
      table {
        width: 100%;
      }
      .save-btn {
        height: 40px;
      }
      .status-chip {
        padding: 3px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
      }
      .status-chip.active {
        background: #dcfce7;
        color: #166534;
      }
      .status-chip.inactive {
        background: #fee2e2;
        color: #991b1b;
      }
    `,
  ],
  standalone: false,
})
export class TrainingProgramsComponent implements OnInit {
  programs: TrainingProgram[] = [];
  displayedColumns = ['name', 'duration', 'cost', 'cutoff', 'attendance', 'status', 'actions'];

  editingId: number | null = null;
  saving = false;
  form: {
    name: string;
    duration: string;
    costPerCandidate: number | null;
    cutoffScore: number | null;
    minimumAttendancePercentage: number | null;
    status: TrainingProgramStatus;
  } = this.emptyForm();

  constructor(
    private trainingBatchService: TrainingBatchService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadPrograms();
  }

  loadPrograms(): void {
    this.trainingBatchService.getPrograms().subscribe((list) => (this.programs = list || []));
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.toastService.error('Please provide a program name.');
      return;
    }
    if (this.form.costPerCandidate == null || this.form.cutoffScore == null || this.form.minimumAttendancePercentage == null) {
      this.toastService.error('Please fill in cost, cutoff score, and minimum attendance.');
      return;
    }
    this.saving = true;

    if (this.editingId) {
      this.trainingBatchService
        .updateProgram(this.editingId, {
          name: this.form.name,
          duration: this.form.duration,
          costPerCandidate: this.form.costPerCandidate,
          cutoffScore: this.form.cutoffScore,
          minimumAttendancePercentage: this.form.minimumAttendancePercentage,
          status: this.form.status,
        })
        .subscribe({
          next: () => {
            this.toastService.success('Training program updated.');
            this.resetForm();
            this.loadPrograms();
          },
          error: () => {
            this.saving = false;
          },
        });
    } else {
      this.trainingBatchService
        .createProgram({
          name: this.form.name,
          duration: this.form.duration,
          costPerCandidate: this.form.costPerCandidate,
          cutoffScore: this.form.cutoffScore,
          minimumAttendancePercentage: this.form.minimumAttendancePercentage,
        })
        .subscribe({
          next: () => {
            this.toastService.success('Training program created.');
            this.resetForm();
            this.loadPrograms();
          },
          error: () => {
            this.saving = false;
          },
        });
    }
  }

  edit(program: TrainingProgram): void {
    this.editingId = program.id;
    this.form = {
      name: program.name,
      duration: program.duration || '',
      costPerCandidate: program.costPerCandidate,
      cutoffScore: program.cutoffScore,
      minimumAttendancePercentage: program.minimumAttendancePercentage,
      status: program.status,
    };
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.editingId = null;
    this.saving = false;
    this.form = this.emptyForm();
  }

  private emptyForm() {
    return {
      name: '',
      duration: '',
      costPerCandidate: null,
      cutoffScore: null,
      minimumAttendancePercentage: null,
      status: 'ACTIVE' as TrainingProgramStatus,
    };
  }
}
