import { Component, Input } from '@angular/core';

/**
 * PageHeader: Consistent page title + breadcrumb + action slot.
 *
 * Usage:
 *   <app-page-header title="Assessment Management" subtitle="Manage and assign assessments">
 *     <button mat-raised-button color="primary">Add New</button>
 *   </app-page-header>
 */
@Component({
    selector: 'app-page-header',
    template: `
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">{{ title }}</h1>
        <p class="page-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-header-actions">
        <ng-content></ng-content>
      </div>
    </div>
  `,
    styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: var(--space-5);
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .page-title {
      font-family: var(--font-display);
      font-size: var(--font-size-h1);
      font-weight: 700;
      color: var(--color-text);
      margin: 0 0 4px;
      line-height: 1.2;
      letter-spacing: -0.01em;
    }
    .page-subtitle {
      font-size: var(--font-size-body);
      color: var(--color-text-muted);
      margin: 0;
    }
    .page-header-actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-wrap: wrap;
    }
  `],
    standalone: false
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
