import { Component, OnInit } from '@angular/core';
import { CityAdminService } from '../../services/city-admin.service';
import { CityAdmin } from '../../models/city-admin.model';

/** HR-facing read-only view of the City training budget passbook (P-Claude.md "BUDGET MODULE":
 *  Total/Reserved/Used/Available per city — bank-passbook style, no Hiring Slots/Training Seats
 *  KPIs). Allocation/manual-adjustment actions are ADMIN-only and live on the Admin Cities page. */
@Component({
  selector: 'app-budget-overview',
  template: `
    <div class="budget-page">
      <app-page-header
        title="Budget Overview"
        subtitle="Monitor the training budget passbook per city."
      ></app-page-header>

      <app-empty-state
        *ngIf="!loading && cities.length === 0"
        icon="account_balance_wallet"
        title="No cities configured"
        subtitle="Ask an administrator to set up cities with budgets."
      ></app-empty-state>

      <div class="location-cards" *ngIf="cities.length > 0">
        <mat-card class="loc-card" *ngFor="let city of cities">
          <mat-card-header>
            <mat-card-title>{{ city.name }}</mat-card-title>
            <mat-card-subtitle>{{ city.blockCount }} training block(s)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="metrics-grid">
              <div class="metric budget-metric">
                <span class="metric-label">Available Budget (₹)</span>
                <div class="budget-numbers">
                  <div class="budget-big">
                    <span class="amount remaining-amount">₹{{ city.availableBudget | number }}</span>
                    <span class="sub-label">available</span>
                  </div>
                  <div class="budget-detail">
                    <span>Total: ₹{{ city.totalBudget | number }}</span>
                    <span>Reserved: ₹{{ city.reservedBudget | number }}</span>
                    <span>Used: ₹{{ city.usedBudget | number }}</span>
                  </div>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="percent(city.reservedBudget + city.usedBudget, city.totalBudget)"
                  [color]="
                    percent(city.reservedBudget + city.usedBudget, city.totalBudget) > 80
                      ? 'warn'
                      : 'primary'
                  "
                ></mat-progress-bar>
                <span class="remaining">Committed (reserved + used): {{ percent(city.reservedBudget + city.usedBudget, city.totalBudget) }}%</span>
              </div>

              <div class="metric">
                <span class="metric-label">Status</span>
                <app-status-badge [status]="city.status"></app-status-badge>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <app-loader *ngIf="loading"></app-loader>
    </div>
  `,
  styles: [
    `
      .budget-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .location-cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 20px;
      }
      .loc-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
      }
      .metrics-grid {
        display: flex;
        flex-direction: column;
        gap: 20px;
        margin-top: 12px;
      }
      .budget-metric {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px;
      }
      .budget-numbers {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin: 8px 0 12px;
      }
      .budget-big {
        display: flex;
        flex-direction: column;
      }
      .remaining-amount {
        font-size: 24px;
        font-weight: 700;
        color: #059669;
      }
      .sub-label {
        font-size: 11px;
        color: #64748b;
        text-transform: uppercase;
      }
      .budget-detail {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        font-size: 12px;
        color: #475569;
        gap: 2px;
      }
      .metric {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .metric-label {
        font-size: 12px;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .remaining {
        font-size: 13px;
        color: #1e293b;
      }
    `,
  ],
  standalone: false,
})
export class BudgetOverviewComponent implements OnInit {
  cities: CityAdmin[] = [];
  loading = false;

  constructor(private cityService: CityAdminService) {}

  ngOnInit(): void {
    this.loading = true;
    this.cityService.getAll().subscribe({
      next: (list) => {
        this.cities = list;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  percent(committed: number, total: number): number {
    return total > 0 ? Math.round((committed / total) * 100) : 0;
  }
}
