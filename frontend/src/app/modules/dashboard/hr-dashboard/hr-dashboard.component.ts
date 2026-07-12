import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { DashboardStats, PendingActions } from '../../../models/admin.model';
import { CityAdminService } from '../../../services/city-admin.service';
import { CityAdmin } from '../../../models/city-admin.model';

interface MetricTile {
  label: string;
  value: number;
}

interface MetricSection {
  title: string;
  icon: string;
  accent: string;
  tiles: MetricTile[];
}

interface PendingActionRow {
  label: string;
  count: number;
  icon: string;
  route: string;
}

/** HR Dashboard — every card is a live count computed by DashboardService (see context.md's
 *  "HR DASHBOARD" card list). Grouped into pipeline-stage sections rather than one flat grid
 *  of ~25 cards, since a flat grid at that count stops being scannable. */
@Component({
  selector: 'app-hr-dashboard',
  template: `
    <div class="dashboard-overview">
      <app-page-header
        title="HR Dashboard"
        subtitle="Real-time recruitment, BGC, joining and training pipeline metrics"
      ></app-page-header>

      <!-- Pending Actions -->
      <mat-card class="pending-card" *ngIf="pending">
        <mat-card-header>
          <mat-card-title>Pending Actions</mat-card-title>
          <mat-card-subtitle>Queues that need HR attention right now</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="pending-grid">
            <div
              class="pending-row"
              *ngFor="let action of pendingRows"
              [class.zero]="action.count === 0"
              [routerLink]="action.route"
            >
              <mat-icon>{{ action.icon }}</mat-icon>
              <span class="pending-label">{{ action.label }}</span>
              <span class="pending-count">{{ action.count }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Budget Alerts (P-Claude.md HR dashboard card) -->
      <mat-card class="pending-card" *ngIf="budgetAlerts.length > 0">
        <mat-card-header>
          <mat-card-title>Budget Alerts</mat-card-title>
          <mat-card-subtitle>Cities running low on available training budget</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="pending-grid">
            <div class="pending-row" *ngFor="let city of budgetAlerts" routerLink="/hr/budget">
              <mat-icon>warning</mat-icon>
              <span class="pending-label">{{ city.name }}</span>
              <span class="pending-count">₹{{ city.availableBudget | number }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Metric sections -->
      <div class="sections-grid" *ngIf="stats">
        <mat-card class="section-card" *ngFor="let section of sections">
          <mat-card-header>
            <div class="section-icon" [ngClass]="section.accent">
              <mat-icon>{{ section.icon }}</mat-icon>
            </div>
            <mat-card-title>{{ section.title }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="tile-grid">
              <div class="tile" *ngFor="let tile of section.tiles">
                <span class="tile-value">{{ tile.value }}</span>
                <span class="tile-label">{{ tile.label }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Charts Section -->
      <div class="charts-container" *ngIf="stats">
        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Application Funnel</mat-card-title>
          </mat-card-header>
          <mat-card-content class="chart-content">
            <div class="custom-funnel">
              <div class="funnel-stage stage-applied">
                <span class="stage-name">Applied</span>
                <span class="stage-val">{{ stats.totalApplications }}</span>
              </div>
              <div
                class="funnel-stage stage-shortlisted"
                [style.width.%]="widthPct(stats.assessmentPassedCount)"
              >
                <span class="stage-name">Passed Assessment</span>
                <span class="stage-val">{{ stats.assessmentPassedCount }}</span>
              </div>
              <div
                class="funnel-stage stage-offered"
                [style.width.%]="widthPct(stats.offerLettersSent)"
              >
                <span class="stage-name">Offered</span>
                <span class="stage-val">{{ stats.offerLettersSent }}</span>
              </div>
              <div
                class="funnel-stage stage-accepted"
                [style.width.%]="widthPct(stats.releasedCandidates)"
              >
                <span class="stage-name">Released</span>
                <span class="stage-val">{{ stats.releasedCandidates }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="chart-card">
          <mat-card-header>
            <mat-card-title>Training Capacity</mat-card-title>
          </mat-card-header>
          <mat-card-content class="vacancy-overview">
            <div class="vacancy-circle">
              <span class="circle-num">{{ stats.totalVacancyAvailable || 0 }}</span>
              <span class="circle-lbl">Open Training Seats</span>
            </div>
            <div class="vacancy-meta">
              <div class="meta-item">
                <span class="dot green-dot"></span>
                <span
                  >Occupied seats:
                  <strong>{{ stats.totalVacancyUsed || 0 }}</strong></span
                >
              </div>
              <div class="meta-item">
                <span class="dot blue-dot"></span>
                <span
                  >Available budget:
                  <strong>₹{{ stats.totalBudgetAvailable || 0 | number }}</strong></span
                >
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-overview {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
      }

      .pending-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }
      .pending-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: var(--space-3);
      }
      .pending-row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) 14px;
        border-radius: var(--radius-control);
        background: #fff7ed;
        border: 1px solid #fed7aa;
        cursor: pointer;
        transition: background 0.15s;
      }
      .pending-row:hover {
        background: #ffedd5;
      }
      .pending-row.zero {
        background: #f8fafc;
        border-color: #e2e8f0;
      }
      .pending-row mat-icon {
        color: #ea580c;
        flex-shrink: 0;
      }
      .pending-row.zero mat-icon {
        color: #94a3b8;
      }
      .pending-label {
        flex: 1;
        font-size: 13px;
        color: #475569;
        font-weight: 500;
      }
      .pending-count {
        font-size: 16px;
        font-weight: 700;
        color: #9a3412;
      }
      .pending-row.zero .pending-count {
        color: #64748b;
      }

      .sections-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: var(--space-4);
      }
      .section-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }
      .section-card mat-card-header {
        display: flex;
        align-items: center;
        gap: var(--space-3);
      }
      .section-icon {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-control);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      .blue {
        background-color: #3b82f6;
      }
      .green {
        background-color: #22c55e;
      }
      .purple {
        background-color: #a855f7;
      }
      .orange {
        background-color: #f97316;
      }
      .indigo {
        background-color: #6366f1;
      }
      .teal {
        background-color: #14b8a6;
      }
      .tile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(90px, 1fr));
        gap: var(--space-3);
        margin-top: var(--space-2);
      }
      .tile {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .tile-value {
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
      }
      .tile-label {
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
      }

      .charts-container {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: var(--space-4);
      }
      @media (max-width: 900px) {
        .charts-container {
          grid-template-columns: 1fr;
        }
        .sections-grid {
          grid-template-columns: 1fr;
        }
      }
      .chart-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
      }
      .chart-content {
        padding: 24px 0 0 0 !important;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .custom-funnel {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }
      .funnel-stage {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        color: white;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        min-width: 120px;
      }
      .stage-applied {
        background-color: #3b82f6;
        width: 100%;
      }
      .stage-shortlisted {
        background-color: #6366f1;
      }
      .stage-offered {
        background-color: #8b5cf6;
      }
      .stage-accepted {
        background-color: #10b981;
      }
      .vacancy-overview {
        padding: 24px 0 0 0 !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      .vacancy-circle {
        width: 130px;
        height: 130px;
        border-radius: 50%;
        border: 8px solid #e2e8f0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .circle-num {
        font-size: 28px;
        font-weight: 700;
        color: #1e293b;
      }
      .circle-lbl {
        font-size: 9px;
        color: #64748b;
        font-weight: 600;
        text-transform: uppercase;
      }
      .vacancy-meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
      }
      .meta-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #475569;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .green-dot {
        background-color: #10b981;
      }
      .blue-dot {
        background-color: #3b82f6;
      }
    `,
  ],
  standalone: false,
})
export class HrDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  pending: PendingActions | null = null;
  sections: MetricSection[] = [];
  pendingRows: PendingActionRow[] = [];
  budgetAlerts: CityAdmin[] = [];

  constructor(
    private dashboardService: DashboardService,
    private cityAdminService: CityAdminService,
  ) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe((s) => {
      this.stats = s;
      this.sections = this.buildSections(s);
    });
    this.dashboardService.getPendingActions().subscribe((p) => {
      this.pending = p;
      this.pendingRows = this.buildPendingRows(p);
    });
    this.cityAdminService.getAll().subscribe((cities) => {
      // Flag a city once its available budget drops to 10% or less of its total allocation.
      this.budgetAlerts = cities.filter(
        (c) => c.totalBudget > 0 && c.availableBudget <= c.totalBudget * 0.1,
      );
    });
  }

  widthPct(value: number): number {
    if (!this.stats || !this.stats.totalApplications) return 0;
    return Math.min(100, (value / this.stats.totalApplications) * 100);
  }

  private buildSections(s: DashboardStats): MetricSection[] {
    return [
      {
        title: 'Applications & Profile',
        icon: 'assignment',
        accent: 'blue',
        tiles: [
          { label: 'Total Applications', value: s.totalApplications },
          { label: 'Profile Completed', value: s.profileCompletedCandidates },
        ],
      },
      {
        title: 'Assessment',
        icon: 'fact_check',
        accent: 'purple',
        tiles: [
          { label: 'Assigned', value: s.assessmentAssignedCount },
          { label: 'Score Uploaded', value: s.assessmentScoreUploadedCount },
          { label: 'Passed', value: s.assessmentPassedCount },
          { label: 'Failed', value: s.assessmentFailedCount },
        ],
      },
      {
        title: 'Offer Letters',
        icon: 'mail',
        accent: 'indigo',
        tiles: [
          { label: 'Generated', value: s.offerLettersGenerated },
          { label: 'Sent', value: s.offerLettersSent },
          { label: 'Accepted', value: s.offerAcceptedCount },
          { label: 'Rejected', value: s.offerRejectedCount },
        ],
      },
      {
        title: 'Background Verification',
        icon: 'verified_user',
        accent: 'teal',
        tiles: [
          { label: 'Initiated', value: s.bgcInitiatedCount },
          { label: 'Docs Submitted', value: s.bgcDocumentsSubmittedCount },
          { label: 'Cleared', value: s.bgcClearedCount },
          { label: 'Failed', value: s.bgcFailedCount },
        ],
      },
      {
        title: 'Selection',
        icon: 'badge',
        accent: 'green',
        tiles: [
          { label: 'Employees Created', value: s.employeesCreated },
          { label: 'Selected Users', value: s.selectedUsersCreated },
        ],
      },
      {
        title: 'Joining',
        icon: 'groups',
        accent: 'blue',
        tiles: [
          { label: 'Batches Created', value: s.joiningBatchesCreated },
          { label: 'Letters Sent', value: s.joiningLettersSent },
          { label: 'Accepted', value: s.joiningAcceptedCount },
        ],
      },
      {
        title: 'Training',
        icon: 'school',
        accent: 'orange',
        tiles: [
          { label: 'Batches Assigned', value: s.trainingBatchesAssigned },
          { label: 'LAP', value: s.lapCandidates },
          { label: 'Passed', value: s.passedTrainees },
          { label: 'Failed', value: s.failedTrainees },
          { label: 'Released', value: s.releasedCandidates },
        ],
      },
      {
        title: 'Project Allocation',
        icon: 'work',
        accent: 'purple',
        tiles: [{ label: 'Allocated', value: s.projectAllocatedCandidates }],
      },
    ];
  }

  private buildPendingRows(p: PendingActions): PendingActionRow[] {
    return [
      {
        label: 'Candidates eligible for assessment',
        count: p.candidatesEligibleForAssessment,
        icon: 'fact_check',
        route: '/hr/applications',
      },
      {
        label: 'Offers generated, pending send',
        count: p.offersPendingSend,
        icon: 'mail',
        route: '/hr/offers',
      },
      {
        label: 'Candidates pending BGC documents',
        count: p.candidatesPendingBgcDocuments,
        icon: 'description',
        route: '/hr/bgv',
      },
      {
        label: 'Candidates eligible for joining batch',
        count: p.candidatesEligibleForBatch,
        icon: 'groups',
        route: '/hr/joining-batches',
      },
      {
        label: 'Training batches requiring result upload',
        count: p.trainingBatchesRequiringResultUpload,
        icon: 'upload_file',
        route: '/hr/joining-batches',
      },
      {
        label: 'LAP candidates requiring review',
        count: p.lapCandidatesRequiringReview,
        icon: 'support',
        route: '/hr/joining-batches',
      },
    ];
  }
}
