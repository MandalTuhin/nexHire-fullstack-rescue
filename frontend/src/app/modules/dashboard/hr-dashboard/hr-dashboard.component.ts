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
  accent: 'brand' | 'success';
  tiles: MetricTile[];
}

interface AttentionRow {
  label: string;
  count: number;
  icon: string;
  route: string;
  isBudget?: boolean;
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
        subtitle="Real-time recruitment, background check, joining and training pipeline metrics"
      ></app-page-header>

      <!-- Attention queue: merges Pending Actions + Budget Alerts into one prioritized list.
           Zero-count queues are noise, not signal — they're omitted entirely. -->
      <mat-card class="attention-card app-card" *ngIf="stats">
        <div class="attention-head">
          <div>
            <h2 class="section-title">Needs your attention</h2>
            <p class="section-sub">Queues and alerts that require action right now</p>
          </div>
          <span class="attention-total" *ngIf="attentionRows.length > 0">{{ attentionRows.length }} open</span>
        </div>

        <div class="attention-grid" *ngIf="attentionRows.length > 0">
          <a
            class="attention-row"
            [class.is-budget]="row.isBudget"
            *ngFor="let row of attentionRows"
            [routerLink]="row.route"
          >
            <span class="attention-icon">
              <mat-icon>{{ row.icon }}</mat-icon>
            </span>
            <span class="attention-label">{{ row.label }}</span>
            <span class="attention-count num">{{ row.isBudget ? ('₹' + (row.count | number)) : row.count }}</span>
            <mat-icon class="attention-arrow">arrow_forward</mat-icon>
          </a>
        </div>

        <div class="attention-empty" *ngIf="attentionRows.length === 0">
          <mat-icon>task_alt</mat-icon>
          <span>All caught up — no queues need attention right now.</span>
        </div>
      </mat-card>

      <!-- Pipeline metric sections -->
      <div class="sections-grid" *ngIf="stats">
        <mat-card class="section-card app-card" *ngFor="let section of sections" [ngClass]="'accent-' + section.accent">
          <div class="section-card-head">
            <span class="section-icon">
              <mat-icon>{{ section.icon }}</mat-icon>
            </span>
            <h3 class="section-card-title">{{ section.title }}</h3>
          </div>
          <div class="tile-grid">
            <div class="tile" *ngFor="let tile of section.tiles">
              <span class="tile-value num">{{ tile.value | number }}</span>
              <span class="tile-label">{{ tile.label }}</span>
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Charts Section -->
      <div class="charts-container" *ngIf="stats">
        <mat-card class="chart-card app-card">
          <h3 class="chart-title">Application Funnel</h3>
          <div class="custom-funnel">
            <div class="funnel-stage stage-1">
              <span class="stage-name">Applied</span>
              <span class="stage-val num">{{ stats.totalApplications | number }}</span>
            </div>
            <div class="funnel-stage stage-2" [style.width.%]="widthPct(stats.assessmentPassedCount)">
              <span class="stage-name">Passed Assessment</span>
              <span class="stage-val num">{{ stats.assessmentPassedCount | number }}</span>
            </div>
            <div class="funnel-stage stage-3" [style.width.%]="widthPct(stats.offerLettersSent)">
              <span class="stage-name">Offered</span>
              <span class="stage-val num">{{ stats.offerLettersSent | number }}</span>
            </div>
            <div class="funnel-stage stage-4" [style.width.%]="widthPct(stats.releasedCandidates)">
              <span class="stage-name">Released</span>
              <span class="stage-val num">{{ stats.releasedCandidates | number }}</span>
            </div>
          </div>
        </mat-card>

        <mat-card class="chart-card app-card">
          <h3 class="chart-title">Training Capacity</h3>
          <div class="vacancy-overview">
            <div class="vacancy-ring" [style.--pct.%]="occupancyPct()">
              <div class="vacancy-ring-inner">
                <span class="circle-num num">{{ stats.totalVacancyAvailable || 0 }}</span>
                <span class="circle-lbl">Open Seats</span>
              </div>
            </div>
            <div class="vacancy-meta">
              <div class="meta-item">
                <span class="dot dot-occupied"></span>
                <span>Occupied seats: <strong class="num">{{ stats.totalVacancyUsed || 0 }}</strong></span>
              </div>
              <div class="meta-item">
                <span class="dot dot-budget"></span>
                <span>Available budget: <strong class="num">₹{{ stats.totalBudgetAvailable || 0 | number }}</strong></span>
              </div>
            </div>
          </div>
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

      /* ─── Attention queue ─────────────────────────────────────────────── */
      .attention-card {
        padding: var(--space-5);
      }
      .attention-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }
      .section-title {
        margin: 0 0 2px;
        font-size: var(--font-size-h2);
        font-weight: 700;
        color: var(--color-text);
      }
      .section-sub {
        margin: 0;
        font-size: var(--font-size-small);
        color: var(--color-text-muted);
      }
      .attention-total {
        flex-shrink: 0;
        padding: 4px 12px;
        border-radius: var(--radius-pill);
        background: var(--brand-100);
        color: var(--brand-700);
        font-size: 12px;
        font-weight: 700;
      }
      .attention-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: var(--space-3);
      }
      .attention-row {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        padding: var(--space-3) 14px;
        border-radius: var(--radius-control);
        background: var(--color-surface-muted);
        border: 1px solid var(--color-border-light);
        text-decoration: none;
        transition: border-color 0.15s, background 0.15s, transform 0.1s;
      }
      .attention-row:hover {
        background: var(--brand-50);
        border-color: var(--brand-200);
        transform: translateY(-1px);
      }
      .attention-icon {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--brand-100);
        color: var(--brand-600);
        flex-shrink: 0;
      }
      .attention-row.is-budget .attention-icon {
        background: var(--color-danger-bg);
        color: var(--color-danger);
      }
      .attention-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
      .attention-label {
        flex: 1;
        font-size: 13px;
        color: var(--color-text-secondary);
        font-weight: 500;
        line-height: 1.3;
      }
      .attention-count {
        font-size: 17px;
        font-weight: 700;
        color: var(--color-text);
      }
      .attention-arrow {
        font-size: 16px;
        width: 16px;
        height: 16px;
        color: var(--color-text-faint);
        opacity: 0;
        transition: opacity 0.15s, transform 0.15s;
        transform: translateX(-4px);
      }
      .attention-row:hover .attention-arrow {
        opacity: 1;
        transform: translateX(0);
      }
      .attention-empty {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-4);
        border-radius: var(--radius-control);
        background: var(--color-success-bg);
        color: var(--color-success);
        font-size: 13px;
        font-weight: 600;
      }

      /* ─── Pipeline metric sections ────────────────────────────────────── */
      .sections-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: var(--space-4);
      }
      .section-card {
        padding: var(--space-4) var(--space-4) var(--space-5);
        border-top: 3px solid var(--color-border);
      }
      .section-card.accent-brand { border-top-color: var(--brand-500); }
      .section-card.accent-success { border-top-color: var(--color-success); }

      .section-card-head {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
      }
      .section-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--color-surface-muted);
        color: var(--color-text-secondary);
      }
      .accent-brand .section-icon { background: var(--brand-100); color: var(--brand-600); }
      .accent-success .section-icon { background: var(--color-success-bg); color: var(--color-success); }
      .section-icon mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
      }
      .section-card-title {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text);
      }

      .tile-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(84px, 1fr));
        gap: var(--space-4) var(--space-3);
      }
      .tile {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .tile-value {
        font-size: 24px;
        font-weight: 700;
        color: var(--color-text);
        line-height: 1;
      }
      .tile-label {
        font-size: 11px;
        color: var(--color-text-muted);
        font-weight: 500;
      }

      /* ─── Charts ───────────────────────────────────────────────────────── */
      .charts-container {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: var(--space-4);
      }
      @media (max-width: 900px) {
        .charts-container {
          grid-template-columns: 1fr;
        }
      }
      .chart-card {
        padding: var(--space-5);
      }
      .chart-title {
        margin: 0 0 var(--space-4);
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text);
      }
      .custom-funnel {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        width: 100%;
        max-width: 100%;
        overflow: hidden;
      }
      .funnel-stage {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 13px 16px;
        color: white;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        min-width: 130px;
        max-width: 100%;
        transition: width 0.4s ease;
      }
      .stage-1 { background: var(--ink-900); width: 100%; }
      .stage-2 { background: var(--brand-700); }
      .stage-3 { background: var(--brand-600); }
      .stage-4 { background: var(--brand-500); }

      .vacancy-overview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-5);
      }
      .vacancy-ring {
        --pct: 0%;
        width: 140px;
        height: 140px;
        border-radius: 50%;
        background: conic-gradient(var(--brand-500) var(--pct), var(--color-border-light) 0);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px;
      }
      .vacancy-ring-inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        background: var(--color-surface);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .circle-num {
        font-size: 26px;
        font-weight: 700;
        color: var(--color-text);
      }
      .circle-lbl {
        font-size: 10px;
        color: var(--color-text-muted);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-top: 2px;
      }
      .vacancy-meta {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        width: 100%;
      }
      .meta-item {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .dot-occupied { background: var(--brand-600); }
      .dot-budget { background: var(--brand-300); }
    `,
  ],
  standalone: false,
})
export class HrDashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  pending: PendingActions | null = null;
  sections: MetricSection[] = [];
  attentionRows: AttentionRow[] = [];
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
      this.rebuildAttentionRows();
    });
    this.cityAdminService.getAll().subscribe((cities) => {
      // Flag a city once its available budget drops to 10% or less of its total allocation.
      this.budgetAlerts = cities.filter(
        (c) => c.totalBudget > 0 && c.availableBudget <= c.totalBudget * 0.1,
      );
      this.rebuildAttentionRows();
    });
  }

  widthPct(value: number): number {
    if (!this.stats || !this.stats.totalApplications) return 0;
    return Math.min(100, (value / this.stats.totalApplications) * 100);
  }

  occupancyPct(): number {
    if (!this.stats) return 0;
    const total = (this.stats.totalVacancyAvailable || 0) + (this.stats.totalVacancyUsed || 0);
    if (!total) return 0;
    return Math.min(100, ((this.stats.totalVacancyUsed || 0) / total) * 100);
  }

  private buildSections(s: DashboardStats): MetricSection[] {
    return [
      {
        title: 'Applications & Profile',
        icon: 'assignment',
        accent: 'brand',
        tiles: [
          { label: 'Total Applications', value: s.totalApplications },
          { label: 'Profile Completed', value: s.profileCompletedCandidates },
        ],
      },
      {
        title: 'Assessment',
        icon: 'fact_check',
        accent: 'brand',
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
        accent: 'brand',
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
        accent: 'brand',
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
        accent: 'success',
        tiles: [
          { label: 'Employees Created', value: s.employeesCreated },
          { label: 'Selected Users', value: s.selectedUsersCreated },
        ],
      },
      {
        title: 'Joining',
        icon: 'groups',
        accent: 'brand',
        tiles: [
          { label: 'Batches Created', value: s.joiningBatchesCreated },
          { label: 'Letters Sent', value: s.joiningLettersSent },
          { label: 'Accepted', value: s.joiningAcceptedCount },
        ],
      },
      {
        title: 'Training',
        icon: 'school',
        accent: 'brand',
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
        accent: 'success',
        tiles: [{ label: 'Allocated', value: s.projectAllocatedCandidates }],
      },
    ];
  }

  private rebuildAttentionRows(): void {
    const p = this.pending;
    const rows: AttentionRow[] = [];
    if (p) {
      const candidates: AttentionRow[] = [
        { label: 'Candidates eligible for assessment', count: p.candidatesEligibleForAssessment, icon: 'fact_check', route: '/hr/applications' },
        { label: 'Offers generated, pending send', count: p.offersPendingSend, icon: 'mail', route: '/hr/offers' },
        { label: 'Candidates pending background check documents', count: p.candidatesPendingBgcDocuments, icon: 'description', route: '/hr/bgv' },
        { label: 'Candidates eligible for joining batch', count: p.candidatesEligibleForBatch, icon: 'groups', route: '/hr/joining-batches' },
        { label: 'Training batches requiring result upload', count: p.trainingBatchesRequiringResultUpload, icon: 'upload_file', route: '/hr/joining-batches' },
        { label: 'LAP candidates requiring review', count: p.lapCandidatesRequiringReview, icon: 'support', route: '/hr/joining-batches' },
      ];
      rows.push(...candidates.filter((r) => r.count > 0));
    }
    rows.push(
      ...this.budgetAlerts.map((city) => ({
        label: `${city.name} is running low on training budget`,
        count: city.availableBudget,
        icon: 'account_balance_wallet',
        route: '/hr/budget',
        isBudget: true,
      })),
    );
    this.attentionRows = rows;
  }
}
