import { Component, OnInit } from '@angular/core';
import {
  ProjectRmgService,
  RmgProject,
  ProjectStatus,
} from '../../services/project-rmg.service';
import { CityAdminService } from '../../services/city-admin.service';
import { CityAdmin } from '../../models/city-admin.model';
import { ToastService } from '../../shared/services/toast.service';

/**
 * Admin project management: full CRUD over projects (P-Claude.md "PROJECTS").
 * Allocation of trainees is handled separately by RMG. Status (ACTIVE/FILLED) is derived
 * automatically from vacancies by the backend once allocations happen; INACTIVE is the only
 * status this form can set directly.
 */
@Component({
  selector: 'app-projects',
  template: `
    <div class="projects-page">
      <app-page-header
        title="Projects"
        subtitle="Create and manage delivery projects. Trainee allocation is handled by RMG."
      ></app-page-header>

      <div class="projects-grid">
        <mat-card class="panel-card">
          <mat-card-header>
            <mat-card-title>{{
              editingId ? 'Edit Project' : 'Create New Project'
            }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-columns">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Project Name</mat-label>
                <input
                  matInput
                  [(ngModel)]="form.name"
                  placeholder="e.g. Banking Portal"
                />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Client</mat-label>
                <input
                  matInput
                  [(ngModel)]="form.client"
                  placeholder="e.g. HDFC Bank"
                />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Technology</mat-label>
                <input
                  matInput
                  [(ngModel)]="form.technology"
                  placeholder="e.g. Java, Spring Boot"
                />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Location</mat-label>
                <mat-select [(ngModel)]="form.locationId">
                  <mat-option [value]="null">—</mat-option>
                  <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Total Vacancies</mat-label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="form.totalVacancies"
                  placeholder="e.g. 15"
                />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea
                  matInput
                  rows="3"
                  [(ngModel)]="form.description"
                  placeholder="Short description of the project"
                ></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width" *ngIf="editingId">
                <mat-label>Status</mat-label>
                <mat-select [(ngModel)]="form.status">
                  <mat-option value="ACTIVE">Active</mat-option>
                  <mat-option value="FILLED">Filled</mat-option>
                  <mat-option value="INACTIVE">Inactive</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button
                mat-raised-button
                color="primary"
                class="save-btn"
                [disabled]="saving"
                (click)="save()"
              >
                {{ editingId ? 'Save Changes' : 'Create Project' }}
              </button>
              <button
                *ngIf="editingId"
                mat-stroked-button
                class="save-btn"
                [disabled]="saving"
                (click)="cancelEdit()"
              >
                Cancel
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="panel-card table-panel">
          <mat-card-header>
            <mat-card-title>All Projects</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state
              *ngIf="projects.length === 0"
              icon="business_center"
              title="No projects found"
              subtitle="Create a project to get started."
            ></app-empty-state>

            <div class="table-container" *ngIf="projects.length > 0">
              <table mat-table [dataSource]="projects">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Project</th>
                  <td mat-cell *matCellDef="let project">{{ project.name }}</td>
                </ng-container>

                <ng-container matColumnDef="client">
                  <th mat-header-cell *matHeaderCellDef>Client</th>
                  <td mat-cell *matCellDef="let project">{{ project.client || 'N/A' }}</td>
                </ng-container>

                <ng-container matColumnDef="technology">
                  <th mat-header-cell *matHeaderCellDef>Technology</th>
                  <td mat-cell *matCellDef="let project">{{ project.technology || 'N/A' }}</td>
                </ng-container>

                <ng-container matColumnDef="location">
                  <th mat-header-cell *matHeaderCellDef>Location</th>
                  <td mat-cell *matCellDef="let project">{{ project.locationName || 'N/A' }}</td>
                </ng-container>

                <ng-container matColumnDef="vacancies">
                  <th mat-header-cell *matHeaderCellDef>Allocated / Total</th>
                  <td mat-cell *matCellDef="let project">
                    {{ project.allocatedCount }} / {{ project.totalVacancies }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let project">
                    <span
                      class="status-chip"
                      [class.active]="project.status === 'ACTIVE'"
                      [class.filled]="project.status === 'FILLED'"
                      [class.inactive]="project.status === 'INACTIVE'"
                    >
                      {{ project.status }}
                    </span>
                  </td>
                </ng-container>

                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef align="end">Actions</th>
                  <td mat-cell *matCellDef="let project" align="end">
                    <button
                      mat-icon-button
                      color="primary"
                      matTooltip="Edit"
                      (click)="edit(project)"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      color="warn"
                      matTooltip="Delete"
                      (click)="remove(project)"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr
                  mat-row
                  *matRowDef="let row; columns: displayedColumns"
                ></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .projects-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .projects-grid {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 24px;
      }
      @media (max-width: 992px) {
        .projects-grid {
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
      .status-chip.filled {
        background: #fef3c7;
        color: #92400e;
      }
      .status-chip.inactive {
        background: #fee2e2;
        color: #991b1b;
      }
    `,
  ],
  standalone: false,
})
export class ProjectsComponent implements OnInit {
  projects: RmgProject[] = [];
  cities: CityAdmin[] = [];
  displayedColumns = ['name', 'client', 'technology', 'location', 'vacancies', 'status', 'actions'];

  editingId: number | null = null;
  saving = false;
  form: {
    name: string;
    description: string;
    client: string;
    technology: string;
    locationId: number | null;
    totalVacancies: number | null;
    status: ProjectStatus;
  } = this.emptyForm();

  constructor(
    private projectService: ProjectRmgService,
    private cityService: CityAdminService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadProjects();
    this.cityService.getAll().subscribe((list) => (this.cities = list || []));
  }

  loadProjects(): void {
    this.projectService
      .getProjects()
      .subscribe((list) => (this.projects = list || []));
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.toastService.error('Please provide a project name.');
      return;
    }
    this.saving = true;

    const payload = {
      name: this.form.name,
      description: this.form.description,
      client: this.form.client,
      technology: this.form.technology,
      locationId: this.form.locationId ?? undefined,
      totalVacancies: this.form.totalVacancies ?? undefined,
      status: this.editingId ? this.form.status : undefined,
    };

    const request$ = this.editingId
      ? this.projectService.updateProject(this.editingId, payload)
      : this.projectService.createProject(payload);

    request$.subscribe({
      next: () => {
        this.toastService.success(this.editingId ? 'Project updated.' : 'Project created.');
        this.resetForm();
        this.loadProjects();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  edit(project: RmgProject): void {
    this.editingId = project.id;
    this.form = {
      name: project.name,
      description: project.description || '',
      client: project.client || '',
      technology: project.technology || '',
      locationId: project.locationId ?? null,
      totalVacancies: project.totalVacancies,
      status: project.status,
    };
  }

  cancelEdit(): void {
    this.resetForm();
  }

  remove(project: RmgProject): void {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
      return;
    }
    this.projectService.deleteProject(project.id).subscribe({
      next: () => {
        this.toastService.success('Project deleted.');
        if (this.editingId === project.id) {
          this.resetForm();
        }
        this.loadProjects();
      },
      error: () => {},
    });
  }

  private resetForm(): void {
    this.editingId = null;
    this.saving = false;
    this.form = this.emptyForm();
  }

  private emptyForm() {
    return {
      name: '',
      description: '',
      client: '',
      technology: '',
      locationId: null,
      totalVacancies: null,
      status: 'ACTIVE' as ProjectStatus,
    };
  }
}
