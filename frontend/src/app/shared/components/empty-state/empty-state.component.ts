import { Component, Input } from '@angular/core';

/**
 * EmptyState: Shows a friendly empty state when no data is available.
 * Usage:
 *   <app-empty-state icon="search_off" title="No applications found" subtitle="Try adjusting your filters"></app-empty-state>
 */
@Component({
    selector: 'app-empty-state',
    template: `
    <div class="empty-state">
      <mat-icon class="empty-icon">{{ icon }}</mat-icon>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      <ng-content></ng-content>
    </div>
  `,
    styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
      color: var(--color-text-muted);
    }
    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--paper-200);
      margin-bottom: 16px;
    }
    .empty-title {
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text);
      margin: 0 0 8px;
    }
    .empty-subtitle {
      font-size: 14px;
      color: var(--color-text-faint);
      margin: 0 0 24px;
      max-width: 320px;
    }
  `],
    standalone: false
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No data found';
  @Input() subtitle = '';
}
