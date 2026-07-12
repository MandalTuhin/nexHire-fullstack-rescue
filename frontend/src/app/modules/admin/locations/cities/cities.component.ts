import { Component, OnInit } from '@angular/core';
import { CityAdminService } from '../../../../services/city-admin.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { CityAdmin, CityStatus } from '../../../../models/city-admin.model';

/** Admin City CRUD (P-Claude.md "CITY MODULE") — real backend, replaces the earlier
 *  mock-data-only page. Budget totals are changed only via the passbook-logged
 *  allocate/adjust actions, never a direct field edit. */
@Component({
  selector: 'app-cities',
  template: `
    <div class="locations-page">
      <app-page-header title="Cities" subtitle="Manage cities and their training budget passbook."></app-page-header>

      <div class="locations-grid">
        <mat-card class="panel-card form-panel">
          <mat-card-header>
            <mat-card-title>{{ editingId ? 'Edit City' : 'Add New City' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>City Name</mat-label>
              <input matInput [(ngModel)]="form.name" placeholder="Enter city name" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width" *ngIf="editingId">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="form.status">
                <mat-option value="ACTIVE">Active</mat-option>
                <mat-option value="INACTIVE">Inactive</mat-option>
              </mat-select>
            </mat-form-field>
            <div class="form-actions">
              <button mat-raised-button color="primary" [disabled]="saving" (click)="save()">
                {{ editingId ? 'Save Changes' : 'Add City' }}
              </button>
              <button *ngIf="editingId" mat-stroked-button [disabled]="saving" (click)="cancelEdit()">Cancel</button>
            </div>

            <div class="allocate-panel" *ngIf="editingId">
              <h4>Allocate / Adjust Budget</h4>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Amount (₹)</mat-label>
                <input matInput type="number" [(ngModel)]="budgetAmount" placeholder="e.g. 500000" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Note</mat-label>
                <input matInput [(ngModel)]="budgetNote" placeholder="Reason (optional)" />
              </mat-form-field>
              <div class="form-actions">
                <button mat-stroked-button color="primary" [disabled]="!budgetAmount" (click)="allocate()">
                  + Allocate
                </button>
                <button mat-stroked-button color="warn" [disabled]="!budgetAmount" (click)="adjust()">
                  Manual Adjustment
                </button>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="panel-card table-panel">
          <mat-card-header>
            <mat-card-title>Existing Cities</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state *ngIf="cities.length === 0" icon="location_city" title="No cities configured" subtitle="Add a city to manage training budgets."></app-empty-state>
            <div class="table-container" *ngIf="cities.length > 0">
              <table mat-table [dataSource]="cities">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>City</th>
                  <td mat-cell *matCellDef="let city">{{ city.name }}</td>
                </ng-container>
                <ng-container matColumnDef="total">
                  <th mat-header-cell *matHeaderCellDef>Total Budget</th>
                  <td mat-cell *matCellDef="let city">₹{{ city.totalBudget | number }}</td>
                </ng-container>
                <ng-container matColumnDef="reserved">
                  <th mat-header-cell *matHeaderCellDef>Reserved</th>
                  <td mat-cell *matCellDef="let city">₹{{ city.reservedBudget | number }}</td>
                </ng-container>
                <ng-container matColumnDef="used">
                  <th mat-header-cell *matHeaderCellDef>Used</th>
                  <td mat-cell *matCellDef="let city">₹{{ city.usedBudget | number }}</td>
                </ng-container>
                <ng-container matColumnDef="available">
                  <th mat-header-cell *matHeaderCellDef>Available</th>
                  <td mat-cell *matCellDef="let city">₹{{ city.availableBudget | number }}</td>
                </ng-container>
                <ng-container matColumnDef="blocks">
                  <th mat-header-cell *matHeaderCellDef>Blocks</th>
                  <td mat-cell *matCellDef="let city">{{ city.blockCount }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let city">
                    <span class="status-chip" [class.active]="city.status === 'ACTIVE'" [class.inactive]="city.status !== 'ACTIVE'">
                      {{ city.status }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef align="end">Actions</th>
                  <td mat-cell *matCellDef="let city" align="end">
                    <button mat-icon-button color="primary" matTooltip="Edit" (click)="edit(city)">
                      <mat-icon>edit</mat-icon>
                    </button>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .locations-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .locations-grid {
        display: grid;
        grid-template-columns: 360px 1fr;
        gap: 24px;
      }
      @media (max-width: 992px) {
        .locations-grid {
          grid-template-columns: 1fr;
        }
      }
      .panel-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
      }
      .full-width {
        width: 100%;
      }
      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 8px;
        flex-wrap: wrap;
      }
      .allocate-panel {
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #e2e8f0;
      }
      .allocate-panel h4 {
        margin: 0 0 12px;
        font-size: 13px;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .table-container {
        margin-top: 16px;
        overflow-x: auto;
      }
      table {
        width: 100%;
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
export class CitiesComponent implements OnInit {
  cities: CityAdmin[] = [];
  displayedColumns = ['name', 'total', 'reserved', 'used', 'available', 'blocks', 'status', 'actions'];

  editingId: number | null = null;
  saving = false;
  form: { name: string; status: CityStatus } = { name: '', status: 'ACTIVE' };

  budgetAmount: number | null = null;
  budgetNote = '';

  constructor(
    private cityService: CityAdminService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadCities();
  }

  loadCities(): void {
    this.cityService.getAll().subscribe((list) => (this.cities = list || []));
  }

  save(): void {
    if (!this.form.name.trim()) {
      this.toastService.error('City name is required.');
      return;
    }
    this.saving = true;

    const request$ = this.editingId
      ? this.cityService.update(this.editingId, { name: this.form.name, status: this.form.status })
      : this.cityService.create({ name: this.form.name });

    request$.subscribe({
      next: () => {
        this.toastService.success(this.editingId ? 'City updated.' : 'City added.');
        this.resetForm();
        this.loadCities();
      },
      error: (e) => {
        this.saving = false;
        this.toastService.error(e.error?.message || 'Failed to save city.');
      },
    });
  }

  edit(city: CityAdmin): void {
    this.editingId = city.id;
    this.form = { name: city.name, status: city.status };
    this.budgetAmount = null;
    this.budgetNote = '';
  }

  cancelEdit(): void {
    this.resetForm();
  }

  allocate(): void {
    if (!this.editingId || !this.budgetAmount) return;
    this.cityService.allocate(this.editingId, { amount: this.budgetAmount, note: this.budgetNote }).subscribe({
      next: () => {
        this.toastService.success('Budget allocated.');
        this.budgetAmount = null;
        this.budgetNote = '';
        this.loadCities();
      },
      error: (e) => this.toastService.error(e.error?.message || 'Failed to allocate budget.'),
    });
  }

  adjust(): void {
    if (!this.editingId || !this.budgetAmount) return;
    this.cityService.adjust(this.editingId, { amount: this.budgetAmount, note: this.budgetNote }).subscribe({
      next: () => {
        this.toastService.success('Budget adjustment applied.');
        this.budgetAmount = null;
        this.budgetNote = '';
        this.loadCities();
      },
      error: (e) => this.toastService.error(e.error?.message || 'Failed to adjust budget.'),
    });
  }

  private resetForm(): void {
    this.editingId = null;
    this.saving = false;
    this.form = { name: '', status: 'ACTIVE' };
    this.budgetAmount = null;
    this.budgetNote = '';
  }
}
