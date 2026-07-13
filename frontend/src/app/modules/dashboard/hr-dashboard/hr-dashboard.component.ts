import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../../services/dashboard.service';
import { DashboardStats, PendingActions } from '../../../models/admin.model';
import { CityAdminService } from '../../../services/city-admin.service';
import { CityAdmin } from '../../../models/city-admin.model';

interface KpiCard {
  title: string;
  icon: string;
  value: number;
  subtitle: string;
  route?: string;
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

      <!-- KPI cards — one metric per card for fast scanning (issue #43). -->
      <div class="kpi-cards-grid" *ngIf="stats">
        <a
          class="kpi-card app-card"
          *ngFor="let card of kpiCards"
          [routerLink]="card.route"
          [class.no-link]="!card.route"
        >
          <span class="kpi-card-icon">
            <mat-icon>{{ card.icon }}</mat-icon>
          </span>
          <div class="kpi-card-body">
            <span class="kpi-card-value num">{{ card.value | number }}</span>
            <span class="kpi-card-title">{{ card.title }}</span>
            <span class="kpi-card-subtitle">{{ card.subtitle }}</span>
          </div>
          <span class="kpi-card-link" *ngIf="card.route">
            View Details <mat-icon>arrow_forward</mat-icon>
          </span>
        </a>
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

      /* ─── KPI cards — one metric per card ─────────────────────────────── */
      .kpi-cards-grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: var(--space-4);
      }
      /* Desktop: 6 cards in the first row, 2 in the second (8 cards total). */
      @media (max-width: 1200px) {
        .kpi-cards-grid { grid-template-columns: repeat(4, 1fr); }
      }
      @media (max-width: 720px) {
        .kpi-cards-grid { grid-template-columns: 1fr; }
      }
      .kpi-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        padding: var(--space-4);
        border: 1px solid var(--color-border-light);
        border-radius: var(--radius-card);
        background: var(--color-surface);
        text-decoration: none;
        transition: border-color 0.15s, transform 0.1s, box-shadow 0.15s;
      }
      .kpi-card:not(.no-link):hover {
        border-color: var(--brand-200);
        box-shadow: var(--shadow-card);
        transform: translateY(-1px);
      }
      .kpi-card.no-link {
        cursor: default;
      }
      .kpi-card-icon {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: var(--brand-100);
        color: var(--brand-600);
      }
      .kpi-card-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .kpi-card-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .kpi-card-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--color-text);
        line-height: 1.1;
      }
      .kpi-card-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
      }
      .kpi-card-subtitle {
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .kpi-card-link {
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: auto;
        font-size: 12px;
        font-weight: 600;
        color: var(--brand-600);
      }
      .kpi-card-link mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
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
  kpiCards: KpiCard[] = [];
  attentionRows: AttentionRow[] = [];
  budgetAlerts: CityAdmin[] = [];

  constructor(
    private dashboardService: DashboardService,
    private cityAdminService: CityAdminService,
  ) {}

  ngOnInit(): void {
    this.dashboardService.getStats().subscribe((s) => {
      this.stats = s;
      this.kpiCards = this.buildKpiCards(s);
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

  /** One KPI per card (issue #43) — reuses the same DashboardStats the old grouped-card
   *  layout read from; no new backend endpoint or field. */
  private buildKpiCards(s: DashboardStats): KpiCard[] {
    return [
      { title: 'Total Applications', icon: 'assignment', value: s.totalApplications, subtitle: 'Applications received', route: '/hr/applications' },
      { title: 'Assessment Assigned', icon: 'fact_check', value: s.assessmentAssignedCount, subtitle: 'Candidates assigned', route: '/hr/applications' },
      { title: 'Offers Sent', icon: 'mail', value: s.offerLettersSent, subtitle: 'Offer letters sent', route: '/hr/offers' },
      { title: 'Documents Submitted', icon: 'verified_user', value: s.bgcDocumentsSubmittedCount, subtitle: 'BGC documents submitted', route: '/hr/bgv' },
      { title: 'Candidates Joined', icon: 'groups', value: s.joiningAcceptedCount, subtitle: 'Successfully joined', route: '/hr/joining-batches' },
      { title: 'Active Training Batches', icon: 'school', value: s.trainingBatchesAssigned, subtitle: 'Currently running', route: '/hr/joining-batches' },
      { title: 'Released Candidates', icon: 'flag', value: s.releasedCandidates, subtitle: 'Training completed', route: '/hr/joining-batches' },
      { title: 'Allocated Candidates', icon: 'work', value: s.projectAllocatedCandidates, subtitle: 'Assigned to projects' },
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
