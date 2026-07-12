import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { AdminDashboardStats } from '../../../models/admin.model';

/** Admin Dashboard — live counts only (P-Claude.md: Active Users, Cities, Blocks,
 *  Budget Utilization, Active Projects, Running Batches). No hardcoded/mock values. */
@Component({
    selector: 'app-admin-dashboard',
    template: `
    <div class="admin-dash">
      <app-page-header title="Admin Dashboard" subtitle="System administration overview"></app-page-header>

      <div class="admin-grid" *ngIf="stats">
        <mat-card class="admin-card">
          <mat-card-content>
            <div class="card-icon purple"><mat-icon>manage_accounts</mat-icon></div>
            <div class="card-body">
              <span class="card-num">{{ stats.activeUsers }}</span>
              <span class="card-lbl">Active Users</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="admin-card">
          <mat-card-content>
            <div class="card-icon teal"><mat-icon>location_city</mat-icon></div>
            <div class="card-body">
              <span class="card-num">{{ stats.cities }}</span>
              <span class="card-lbl">Cities</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="admin-card">
          <mat-card-content>
            <div class="card-icon orange"><mat-icon>domain</mat-icon></div>
            <div class="card-body">
              <span class="card-num">{{ stats.blocks }}</span>
              <span class="card-lbl">Blocks</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="admin-card">
          <mat-card-content>
            <div class="card-icon indigo"><mat-icon>account_balance</mat-icon></div>
            <div class="card-body">
              <span class="card-num">{{ stats.budgetUtilizationPercent }}%</span>
              <span class="card-lbl">Budget Utilization</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="admin-card">
          <mat-card-content>
            <div class="card-icon blue"><mat-icon>business_center</mat-icon></div>
            <div class="card-body">
              <span class="card-num">{{ stats.activeProjects }}</span>
              <span class="card-lbl">Active Projects</span>
            </div>
          </mat-card-content>
        </mat-card>
        <mat-card class="admin-card">
          <mat-card-content>
            <div class="card-icon green"><mat-icon>school</mat-icon></div>
            <div class="card-body">
              <span class="card-num">{{ stats.runningBatches }}</span>
              <span class="card-lbl">Running Batches</span>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="quick-links-card">
        <mat-card-header>
          <mat-card-title>Quick Administration</mat-card-title>
        </mat-card-header>
        <mat-card-content class="quick-links">
          <a routerLink="/admin/users" mat-stroked-button color="primary">
            <mat-icon>manage_accounts</mat-icon> Manage Users
          </a>
          <a routerLink="/admin/cities" mat-stroked-button color="primary">
            <mat-icon>location_city</mat-icon> Manage Cities
          </a>
          <a routerLink="/admin/blocks" mat-stroked-button color="primary">
            <mat-icon>domain</mat-icon> Manage Blocks
          </a>
          <a routerLink="/admin/projects" mat-stroked-button color="primary">
            <mat-icon>business_center</mat-icon> Manage Projects
          </a>
          <a routerLink="/admin/training-programs" mat-stroked-button color="primary">
            <mat-icon>school</mat-icon> Training Programs
          </a>
        </mat-card-content>
      </mat-card>
    </div>
  `,
    styles: [`
    .admin-dash { display: flex; flex-direction: column; gap: 24px; }
    .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .admin-card { border-radius: var(--radius-card) !important; box-shadow: var(--shadow-card) !important; }
    mat-card-content { display: flex; align-items: center; gap: 16px; padding: 16px !important; }
    .card-icon {
      width: 48px; height: 48px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; color: white;
    }
    .card-icon mat-icon { font-size: 24px; }
    .purple { background: #7c3aed; }
    .indigo { background: #4f46e5; }
    .teal { background: #0d9488; }
    .orange { background: #ea580c; }
    .blue { background: #2563eb; }
    .green { background: #16a34a; }
    .card-body { display: flex; flex-direction: column; }
    .card-num { font-size: 26px; font-weight: 700; color: #1e293b; }
    .card-lbl { font-size: 13px; color: #64748b; font-weight: 500; }
    .quick-links-card { border-radius: var(--radius-card) !important; box-shadow: var(--shadow-card) !important; }
    .quick-links { display: flex; flex-wrap: wrap; gap: 12px; padding-top: 12px; }
    .quick-links a { display: flex; align-items: center; gap: 8px; }
  `],
    standalone: false
})
export class AdminDashboardComponent implements OnInit {
  stats: AdminDashboardStats | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getAdminStats().subscribe((s) => (this.stats = s));
  }
}
