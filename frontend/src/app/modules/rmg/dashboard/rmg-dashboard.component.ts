import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { RmgDashboardStats } from '../../../models/admin.model';

/** RMG Dashboard (P-Claude.md): Released Candidates Waiting, Active Projects,
 *  Remaining Vacancies, Recent Allocations — all live from the backend. */
@Component({
  selector: 'app-rmg-dashboard',
  template: `
    <div class="rmg-dash">
      <app-page-header
        title="RMG Dashboard"
        subtitle="Track released candidates awaiting allocation and project vacancies."
      ></app-page-header>

      <div class="stats-grid" *ngIf="stats">
        <mat-card class="stat-card">
          <mat-icon class="stat-icon waiting">hourglass_top</mat-icon>
          <div class="stat-body">
            <span class="stat-num">{{ stats.releasedCandidatesWaiting }}</span>
            <span class="stat-lbl">Released Candidates Waiting</span>
          </div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon class="stat-icon active">business_center</mat-icon>
          <div class="stat-body">
            <span class="stat-num">{{ stats.activeProjects }}</span>
            <span class="stat-lbl">Active Projects</span>
          </div>
        </mat-card>
        <mat-card class="stat-card">
          <mat-icon class="stat-icon vacancy">event_seat</mat-icon>
          <div class="stat-body">
            <span class="stat-num">{{ stats.remainingVacancies }}</span>
            <span class="stat-lbl">Remaining Vacancies</span>
          </div>
        </mat-card>
      </div>

      <mat-card class="recent-card">
        <mat-card-header>
          <mat-card-title>Recent Allocations</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <app-empty-state
            *ngIf="stats && stats.recentAllocations.length === 0"
            icon="history"
            title="No allocations yet"
            subtitle="Assigned candidates will appear here."
          ></app-empty-state>
          <div class="recent-list" *ngIf="stats && stats.recentAllocations.length > 0">
            <div class="recent-item" *ngFor="let a of stats.recentAllocations">
              <div>
                <span class="candidate">{{ a.candidateName }}</span>
                <span class="project">→ {{ a.projectName }}</span>
              </div>
              <span class="when">{{ a.assignedAt }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <a routerLink="/rmg/allocation" mat-raised-button color="primary" class="cta-btn">
        <mat-icon>business_center</mat-icon> Go to Project Allocation
      </a>
    </div>
  `,
  styles: [
    `
      .rmg-dash {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 20px;
      }
      .stat-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px !important;
      }
      .stat-icon {
        width: 48px;
        height: 48px;
        font-size: 26px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .stat-icon.waiting {
        background: #f59e0b;
      }
      .stat-icon.active {
        background: var(--brand-500);
      }
      .stat-icon.vacancy {
        background: #16a34a;
      }
      .stat-body {
        display: flex;
        flex-direction: column;
      }
      .stat-num {
        font-size: 26px;
        font-weight: 700;
        color: #1e293b;
      }
      .stat-lbl {
        font-size: 12px;
        color: #64748b;
      }
      .recent-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }
      .recent-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 8px;
      }
      .recent-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .candidate {
        font-weight: 600;
        color: #1e293b;
      }
      .project {
        margin-left: 6px;
        color: #64748b;
        font-size: 13px;
      }
      .when {
        font-size: 12px;
        color: #94a3b8;
      }
      .cta-btn {
        width: fit-content;
      }
    `,
  ],
  standalone: false,
})
export class RmgDashboardComponent implements OnInit {
  stats: RmgDashboardStats | null = null;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.dashboardService.getRmgStats().subscribe((s) => (this.stats = s));
  }
}
