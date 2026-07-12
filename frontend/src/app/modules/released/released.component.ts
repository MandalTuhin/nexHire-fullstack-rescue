import { Component, OnInit } from '@angular/core';
import {
  ProjectRmgService,
  RmgProject,
} from '../../services/project-rmg.service';
import { TraineeRecord } from '../../services/trainee-progress.service';
import { ToastService } from '../../shared/services/toast.service';
import { BulkAction } from '../../shared/components/bulk-action-bar/bulk-action-bar.component';

/** RMG Project Allocation — search/filter/multi-select/bulk allocation (P-Claude.md section 8),
 *  with per-vacancy validation enforced server-side. */
@Component({
  selector: 'app-released-candidates',
  template: `
    <div class="released-candidates">
      <app-page-header
        title="Project Allocation"
        subtitle="Assign training-completed trainees to projects. Projects are created by Admin."
      ></app-page-header>

      <div class="allocation-grid">
        <!-- Eligible trainees -->
        <mat-card class="column-card">
          <mat-card-header>
            <mat-card-title
              >Released Candidates Waiting ({{ filteredEligible.length }})</mat-card-title
            >
          </mat-card-header>
          <mat-card-content>
            <div class="filter-row">
              <mat-form-field appearance="outline" class="search-field">
                <mat-label>Search candidate</mat-label>
                <input matInput [(ngModel)]="search" (ngModelChange)="applyFilter()" placeholder="Name or email" />
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>
              <mat-form-field appearance="outline" class="proj-select">
                <mat-label>Bulk target project</mat-label>
                <mat-select [(ngModel)]="bulkTargetProjectId">
                  <mat-option *ngFor="let p of projects" [value]="p.id">{{ p.name }}</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <app-bulk-action-bar
              [selectedCount]="selected.size"
              [actions]="bulkActions"
              (actionClicked)="onBulkAction($event)"
              (selectionCleared)="selected.clear()"
            ></app-bulk-action-bar>

            <app-empty-state
              *ngIf="filteredEligible.length === 0"
              icon="people"
              title="No eligible trainees"
              subtitle="Trainees must complete training to be eligible for allocation."
            ></app-empty-state>

            <div class="table-container" *ngIf="filteredEligible.length > 0">
              <table mat-table [dataSource]="filteredEligible">
                <ng-container matColumnDef="select">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let t">
                    <mat-checkbox
                      [checked]="selected.has(t.traineeId)"
                      (change)="toggle(t.traineeId)"
                    ></mat-checkbox>
                  </td>
                </ng-container>
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
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef align="end">Assign</th>
                  <td mat-cell *matCellDef="let t" align="end">
                    <mat-form-field appearance="outline" class="proj-select">
                      <mat-label>Project</mat-label>
                      <mat-select [(ngModel)]="selectedProject[t.traineeId]">
                        <mat-option *ngFor="let p of projects" [value]="p.id">{{
                          p.name
                        }}</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <button
                      mat-flat-button
                      color="primary"
                      class="row-btn"
                      [disabled]="!selectedProject[t.traineeId]"
                      (click)="assign(t)"
                    >
                      Assign
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="candidateColumns"></tr>
                <tr
                  mat-row
                  *matRowDef="let row; columns: candidateColumns"
                ></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Projects (read-only; managed by Admin) -->
        <mat-card class="column-card">
          <mat-card-header>
            <mat-card-title>Active Projects</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state
              *ngIf="projects.length === 0"
              icon="business_center"
              title="No active projects"
              subtitle="Projects are created by an administrator."
            ></app-empty-state>

            <div class="proj-list" *ngIf="projects.length > 0">
              <div class="proj-item" *ngFor="let p of projects">
                <div>
                  <span class="pname">{{ p.name }}</span>
                  <span class="pdesc">{{ p.client }} · {{ p.technology }}</span>
                </div>
                <span class="team">{{ p.remainingVacancies }} of {{ p.totalVacancies }} open</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .released-candidates {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .allocation-grid {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 24px;
      }
      @media (max-width: 992px) {
        .allocation-grid {
          grid-template-columns: 1fr;
        }
      }
      .column-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
        height: fit-content;
      }
      .filter-row {
        display: flex;
        gap: 16px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .search-field {
        flex: 1;
        min-width: 200px;
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
      .proj-select {
        width: 180px;
        margin-right: 8px;
      }
      .row-btn {
        height: 40px;
      }
      .proj-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .proj-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .pname {
        font-weight: 600;
        color: #1e293b;
        display: block;
      }
      .pdesc {
        font-size: 12px;
        color: #64748b;
      }
      .team {
        font-size: 12px;
        font-weight: 600;
        color: #4f46e5;
      }
    `,
  ],
  standalone: false,
})
export class ReleasedCandidatesComponent implements OnInit {
  eligible: TraineeRecord[] = [];
  filteredEligible: TraineeRecord[] = [];
  projects: RmgProject[] = [];
  candidateColumns = ['select', 'candidate', 'job', 'actions'];
  selectedProject: Record<number, number> = {};

  search = '';
  selected = new Set<number>();
  bulkTargetProjectId: number | null = null;

  readonly bulkActions: BulkAction[] = [
    { id: 'bulk-assign', label: 'Assign Selected to Project', icon: 'business_center', color: 'primary' },
  ];

  constructor(
    private rmg: ProjectRmgService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    // RMG allocates to ACTIVE projects only (FILLED/INACTIVE have no open vacancies or are
    // disabled by Admin; projects themselves are created/managed by Admin).
    this.rmg
      .getProjects()
      .subscribe(
        (list) => (this.projects = (list || []).filter((p) => p.status === 'ACTIVE')),
      );
    this.rmg.getEligibleTrainees().subscribe((list) => {
      this.eligible = list;
      this.applyFilter();
    });
  }

  applyFilter(): void {
    const s = this.search.trim().toLowerCase();
    this.filteredEligible = !s
      ? this.eligible
      : this.eligible.filter(
          (t) =>
            (t.candidateName || '').toLowerCase().includes(s) ||
            (t.candidateEmail || '').toLowerCase().includes(s),
        );
    const visibleIds = new Set(this.filteredEligible.map((t) => t.traineeId));
    for (const id of Array.from(this.selected)) {
      if (!visibleIds.has(id)) this.selected.delete(id);
    }
  }

  toggle(traineeId: number): void {
    if (this.selected.has(traineeId)) {
      this.selected.delete(traineeId);
    } else {
      this.selected.add(traineeId);
    }
  }

  assign(t: TraineeRecord): void {
    const projectId = this.selectedProject[t.traineeId];
    if (!projectId) return;
    this.rmg.assign(projectId, t.traineeId).subscribe({
      next: () => {
        this.toast.success(`${t.candidateName} assigned to project`);
        this.load();
      },
      error: (e) => this.toast.error(e.error?.message || 'Failed to assign'),
    });
  }

  onBulkAction(actionId: string): void {
    if (actionId === 'bulk-assign') {
      this.bulkAssign();
    }
  }

  bulkAssign(): void {
    if (!this.bulkTargetProjectId) {
      this.toast.error('Choose a target project for the bulk assignment first.');
      return;
    }
    const traineeIds = Array.from(this.selected);
    this.rmg.bulkAssign(this.bulkTargetProjectId, traineeIds).subscribe({
      next: (result) => {
        this.selected.clear();
        this.load();
        if (result.failureCount === 0) {
          this.toast.success(`${result.successCount} candidate(s) assigned successfully.`);
        } else {
          this.toast.warning(`${result.successCount} assigned, ${result.failureCount} failed.`);
        }
      },
      error: (e) => this.toast.error(e.error?.message || 'Bulk assignment failed'),
    });
  }
}
