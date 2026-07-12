import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import {
  AdminUserService,
  AdminUser,
} from '../../../services/admin-user.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TableColumn } from '../../../shared/components/data-table/data-table.component';
import { CreateUserDialogComponent } from './create-user-dialog.component';

/** DataTableComponent requires rows to carry an `id`; AdminUser already has one. */
type UserRow = AdminUser;

@Component({
  selector: 'app-user-management',
  template: `
    <div class="user-management-container">
      <app-page-header
        title="User Management"
        subtitle="Manage system users, update roles, and restrict access."
      >
        <button mat-raised-button color="primary" (click)="openCreateUser()">
          <mat-icon>person_add</mat-icon> Create User
        </button>
      </app-page-header>

      <mat-card class="filter-card">
        <mat-card-content class="filter-row">
          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="search" (ngModelChange)="onSearchChange()" placeholder="Name or email" />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-item">
            <mat-label>Role</mat-label>
            <mat-select [(ngModel)]="roleFilter" (selectionChange)="onFilterChange()">
              <mat-option value="">All</mat-option>
              <mat-option value="EMPLOYEE">Employee</mat-option>
              <mat-option value="HR">HR</mat-option>
              <mat-option value="RMG">RMG</mat-option>
              <mat-option value="ADMIN">Admin</mat-option>
            </mat-select>
          </mat-form-field>
        </mat-card-content>
      </mat-card>

      <mat-card class="table-card">
        <mat-card-content>
          <app-data-table
            [columns]="columns"
            [data]="rows"
            [totalRecords]="totalRecords"
            [pageSize]="size"
            [loading]="loading"
            emptyMessage="No users found"
            (pageChange)="onPageChange($event)"
          ></app-data-table>
        </mat-card-content>
      </mat-card>

      <ng-template #userCell let-row>
        <div class="user-meta">
          <span class="name">{{ row.name }}</span>
          <span class="email">{{ row.email }}</span>
        </div>
      </ng-template>

      <ng-template #roleCell let-row>
        <span [ngClass]="getRoleClass(row.role)" class="role-badge">
          {{ row.role }}
        </span>
      </ng-template>

      <ng-template #statusCell let-row>
        <span
          class="status-badge"
          [class.active]="row.active"
          [class.restricted]="!row.active"
        >
          {{ row.active ? 'Active' : 'Restricted' }}
        </span>
      </ng-template>

      <ng-template #actionsCell let-row>
        <button
          *ngIf="row.active"
          mat-stroked-button
          color="warn"
          (click)="deactivate(row)"
        >
          Restrict Access
        </button>
        <button
          *ngIf="!row.active"
          mat-stroked-button
          color="primary"
          (click)="reactivate(row)"
        >
          Restore Access
        </button>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .user-management-container {
        display: flex;
        flex-direction: column;
        gap: 24px;
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
      .user-meta {
        display: flex;
        flex-direction: column;
        padding: 8px 0;
      }
      .user-meta .name {
        font-weight: 600;
        color: #1e293b;
      }
      .user-meta .email {
        font-size: 12px;
        color: #64748b;
      }
      .status-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
      .status-badge.active {
        background: #dcfce7;
        color: #15803d;
      }
      .status-badge.restricted {
        background: #fee2e2;
        color: #dc2626;
      }
      .role-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        height: 24px;
        line-height: 24px;
        padding: 0 14px;
      }
      .role-admin {
        background-color: #f3e8ff !important;
        color: #7c3aed !important;
      }
      .role-hr {
        background-color: #dbeafe !important;
        color: #1d4ed8 !important;
      }
      .role-rmg {
        background-color: #ccfbf1 !important;
        color: #0f766e !important;
      }
      .role-candidate {
        background-color: #f1f5f9 !important;
        color: #475569 !important;
      }
    `,
  ],
  standalone: false,
})
export class UserManagementComponent implements OnInit, AfterViewInit {
  @ViewChild('userCell') userCellTpl!: TemplateRef<any>;
  @ViewChild('roleCell') roleCellTpl!: TemplateRef<any>;
  @ViewChild('statusCell') statusCellTpl!: TemplateRef<any>;
  @ViewChild('actionsCell') actionsCellTpl!: TemplateRef<any>;

  columns: TableColumn[] = [];

  rows: UserRow[] = [];
  totalRecords = 0;
  loading = false;

  page = 0;
  size = 20;

  search = '';
  roleFilter = '';

  constructor(
    private adminUserService: AdminUserService,
    private toast: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  openCreateUser(): void {
    this.dialog
      .open(CreateUserDialogComponent, { width: '420px' })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.page = 0;
          this.load();
        }
      });
  }

  ngAfterViewInit(): void {
    this.columns = [
      { field: 'user', label: 'User', sortable: false, cellTemplate: this.userCellTpl },
      { field: 'role', label: 'Role', sortable: false, cellTemplate: this.roleCellTpl },
      { field: 'status', label: 'Status', sortable: false, cellTemplate: this.statusCellTpl },
      { field: 'actions', label: 'Actions', sortable: false, cellTemplate: this.actionsCellTpl },
    ];
  }

  load(): void {
    this.loading = true;
    this.adminUserService
      .search({ search: this.search, role: this.roleFilter, page: this.page, size: this.size })
      .subscribe({
        next: (result) => {
          this.rows = result.content;
          this.totalRecords = result.totalElements;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onSearchChange(): void {
    this.page = 0;
    this.load();
  }

  onFilterChange(): void {
    this.page = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.load();
  }

  getRoleClass(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'role-admin';
      case 'HR':
        return 'role-hr';
      case 'RMG':
        return 'role-rmg';
      default:
        return 'role-candidate';
    }
  }

  deactivate(user: AdminUser): void {
    this.adminUserService.deactivate(user.id).subscribe({
      next: () => {
        user.active = false;
        this.toast.success('Access restricted');
      },
      error: () => {},
    });
  }

  reactivate(user: AdminUser): void {
    this.adminUserService.reactivate(user.id).subscribe({
      next: () => {
        user.active = true;
        this.toast.success('Access restored');
      },
      error: () => {},
    });
  }
}
