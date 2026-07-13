import { Component, OnInit } from '@angular/core';
import { BlockAdminService } from '../../../../services/block-admin.service';
import { CityAdminService } from '../../../../services/city-admin.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { BlockAdmin, BlockStatus } from '../../../../models/city-admin.model';
import { CityAdmin } from '../../../../models/city-admin.model';

/** Admin Block CRUD (P-Claude.md "BLOCK MODULE") — real backend, replaces the earlier
 *  mock-data-only Branch-based page. A Block belongs directly to a City (no Branch layer)
 *  and can only run one active training batch at a time — see BlockService.bookBlock. */
@Component({
  selector: 'app-blocks',
  template: `
    <div class="locations-page">
      <app-page-header title="Blocks" subtitle="Manage physical training rooms and their capacity."></app-page-header>

      <div class="locations-grid">
        <mat-card class="panel-card form-panel">
          <mat-card-header>
            <mat-card-title>{{ editingId ? 'Edit Block' : 'Add New Block' }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Block Name</mat-label>
              <input matInput [(ngModel)]="form.name" placeholder="e.g. Block A" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>City</mat-label>
              <mat-select [(ngModel)]="form.cityId">
                <mat-option *ngFor="let city of cities" [value]="city.id">{{ city.name }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Capacity</mat-label>
              <input matInput type="number" [(ngModel)]="form.capacity" placeholder="e.g. 60" />
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
                {{ editingId ? 'Save Changes' : 'Add Block' }}
              </button>
              <button *ngIf="editingId" mat-stroked-button [disabled]="saving" (click)="cancelEdit()">Cancel</button>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="panel-card table-panel">
          <mat-card-header>
            <mat-card-title>Existing Blocks</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state *ngIf="blocks.length === 0" icon="location_on" title="No blocks configured" subtitle="Add training blocks to support batch allocation."></app-empty-state>
            <div class="table-container" *ngIf="blocks.length > 0">
              <table mat-table [dataSource]="blocks">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Block</th>
                  <td mat-cell *matCellDef="let block">{{ block.name }}</td>
                </ng-container>
                <ng-container matColumnDef="city">
                  <th mat-header-cell *matHeaderCellDef>City</th>
                  <td mat-cell *matCellDef="let block">{{ block.cityName }}</td>
                </ng-container>
                <ng-container matColumnDef="capacity">
                  <th mat-header-cell *matHeaderCellDef>Capacity</th>
                  <td mat-cell *matCellDef="let block">{{ block.capacity }}</td>
                </ng-container>
                <ng-container matColumnDef="activeBatch">
                  <th mat-header-cell *matHeaderCellDef>Current Active Batch</th>
                  <td mat-cell *matCellDef="let block">{{ block.currentActiveBatchCode || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="availability">
                  <th mat-header-cell *matHeaderCellDef>Availability</th>
                  <td mat-cell *matCellDef="let block">
                    <span class="status-chip" [class.active]="block.available" [class.inactive]="!block.available">
                      {{ block.available ? 'Available' : 'Booked' }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let block"><app-status-badge [status]="block.status"></app-status-badge></td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef align="end">Actions</th>
                  <td mat-cell *matCellDef="let block" align="end">
                    <button mat-icon-button color="primary" matTooltip="Edit" (click)="edit(block)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button
                      mat-icon-button
                      color="warn"
                      matTooltip="Delete"
                      [disabled]="!!block.currentActiveBatchId"
                      (click)="remove(block)"
                    >
                      <mat-icon>delete</mat-icon>
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
export class BlocksComponent implements OnInit {
  blocks: BlockAdmin[] = [];
  cities: CityAdmin[] = [];
  displayedColumns = ['name', 'city', 'capacity', 'activeBatch', 'availability', 'status', 'actions'];

  editingId: number | null = null;
  saving = false;
  form: { name: string; cityId: number | null; capacity: number | null; status: BlockStatus } = this.emptyForm();

  constructor(
    private blockService: BlockAdminService,
    private cityService: CityAdminService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.loadCities();
    this.loadBlocks();
  }

  loadCities(): void {
    this.cityService.getAll().subscribe((list) => (this.cities = list || []));
  }

  loadBlocks(): void {
    this.blockService.getAll().subscribe((list) => (this.blocks = list || []));
  }

  save(): void {
    if (!this.form.name.trim() || !this.form.cityId || !this.form.capacity) {
      this.toastService.error('Block name, city, and capacity are required.');
      return;
    }
    this.saving = true;

    const payload = {
      name: this.form.name,
      cityId: this.form.cityId ?? undefined,
      capacity: this.form.capacity ?? undefined,
      status: this.form.status,
    };
    const request$ = this.editingId
      ? this.blockService.update(this.editingId, payload)
      : this.blockService.create(payload);

    request$.subscribe({
      next: () => {
        this.toastService.success(this.editingId ? 'Block updated.' : 'Block added.');
        this.resetForm();
        this.loadBlocks();
      },
      error: () => {
        this.saving = false;
      },
    });
  }

  edit(block: BlockAdmin): void {
    this.editingId = block.id;
    this.form = { name: block.name, cityId: block.cityId, capacity: block.capacity, status: block.status };
  }

  cancelEdit(): void {
    this.resetForm();
  }

  remove(block: BlockAdmin): void {
    if (!confirm(`Delete block "${block.name}"? This cannot be undone.`)) {
      return;
    }
    this.blockService.delete(block.id).subscribe({
      next: () => {
        this.toastService.success('Block deleted.');
        if (this.editingId === block.id) this.resetForm();
        this.loadBlocks();
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
    return { name: '', cityId: null, capacity: null, status: 'ACTIVE' as BlockStatus };
  }
}
