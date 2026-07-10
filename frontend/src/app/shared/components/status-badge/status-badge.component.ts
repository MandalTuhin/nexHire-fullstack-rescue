import { Component, Input } from '@angular/core';

/**
 * StatusBadge: Displays a color-coded badge for any entity status.
 * Supports all NexHire statuses across all modules.
 *
 * Usage:
 *   <app-status-badge [status]="application.status"></app-status-badge>
 */
@Component({
  selector: 'app-status-badge',
  template: `
    <span class="status-badge" [ngClass]="getBadgeClass()">
      {{ getLabel() }}
    </span>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.3px;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .badge-success {
        background-color: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }
      .badge-danger {
        background-color: #fee2e2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }
      .badge-warning {
        background-color: #fef9c3;
        color: #a16207;
        border: 1px solid #fef08a;
      }
      .badge-info {
        background-color: #dbeafe;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
      }
      .badge-secondary {
        background-color: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
      }
      .badge-purple {
        background-color: #f3e8ff;
        color: #7c3aed;
        border: 1px solid #e9d5ff;
      }
      .badge-orange {
        background-color: #ffedd5;
        color: #c2410c;
        border: 1px solid #fed7aa;
      }
      .badge-teal {
        background-color: #ccfbf1;
        color: #0f766e;
        border: 1px solid #99f6e4;
      }
    `,
  ],
  standalone: false,
})
export class StatusBadgeComponent {
  @Input() status: string = '';
  @Input() label?: string;

  private readonly STATUS_CONFIG: Record<
    string,
    { class: string; label: string }
  > = {
    // Application (backend ApplicationStatus — canonical context.md vocabulary)
    APPLIED: { class: 'badge-info', label: 'Applied' },
    ASSESSMENT_ASSIGNED: { class: 'badge-warning', label: 'Assessment Assigned' },
    ASSESSMENT_SCORE_UPLOADED: { class: 'badge-purple', label: 'Score Uploaded' },
    ASSESSMENT_PASSED: { class: 'badge-success', label: 'Assessment Passed' },
    ASSESSMENT_FAILED: { class: 'badge-danger', label: 'Assessment Failed' },
    OFFER_GENERATED: { class: 'badge-purple', label: 'Offer Generated' },
    OFFER_SENT: { class: 'badge-info', label: 'Offer Sent' },
    OFFER_ACCEPTED: { class: 'badge-success', label: 'Offer Accepted' },
    OFFER_REJECTED: { class: 'badge-danger', label: 'Offer Rejected' },
    BGC_INITIATED: { class: 'badge-warning', label: 'BGC Initiated' },
    BGC_DOCUMENTS_PENDING: { class: 'badge-warning', label: 'BGC Docs Pending' },
    BGC_DOCUMENTS_SUBMITTED: { class: 'badge-purple', label: 'BGC Docs Submitted' },
    BGC_VERIFICATION_IN_PROGRESS: { class: 'badge-warning', label: 'BGC In Progress' },
    BGC_CLEARED: { class: 'badge-success', label: 'BGC Cleared' },
    BGC_FAILED: { class: 'badge-danger', label: 'BGC Failed' },
    EMPLOYEE_CREATED: { class: 'badge-teal', label: 'Employee Created' },
    SELECTED_USER_CREATED: { class: 'badge-teal', label: 'Selected' },
    JOINING_BATCH_ASSIGNED: { class: 'badge-info', label: 'Batch Assigned' },
    JOINING_LETTER_GENERATED: { class: 'badge-purple', label: 'Letter Generated' },
    JOINING_ON_HOLD: { class: 'badge-orange', label: 'Joining On Hold' },
    JOINING_LETTER_SENT: { class: 'badge-info', label: 'Joining Letter Sent' },
    JOINING_ACCEPTED: { class: 'badge-success', label: 'Joining Accepted' },
    JOINING_REJECTED: { class: 'badge-danger', label: 'Joining Rejected' },
    // JoiningBatchStatus (COMPLETED/CLOSED shared with generic keys below)
    CREATED: { class: 'badge-secondary', label: 'Created' },
    JOINING_ACCEPTANCE_IN_PROGRESS: { class: 'badge-warning', label: 'Acceptance In Progress' },
    READY_FOR_TRAINING: { class: 'badge-success', label: 'Ready For Training' },
    ASSIGNED_TO_TRAINING: { class: 'badge-teal', label: 'Assigned To Training' },
    CANCELLED: { class: 'badge-danger', label: 'Cancelled' },
    // TRAINING_ASSIGNED shared with the legacy Training-entity block further below
    TRAINING_IN_PROGRESS: {
      class: 'badge-warning',
      label: 'Training In Progress',
    },
    TRAINING_RESULT_UPLOADED: { class: 'badge-purple', label: 'Result Uploaded' },
    TRAINING_COMPLETED: { class: 'badge-success', label: 'Training Completed' },
    LAP: { class: 'badge-orange', label: 'LAP' },
    COMPLETED_WITH_EXCEPTIONS: { class: 'badge-orange', label: 'Completed (Exceptions)' },
    RELEASED: { class: 'badge-secondary', label: 'Released' },
    PROJECT_ASSIGNED: { class: 'badge-teal', label: 'Project Assigned' },
    ONBOARDED: { class: 'badge-success', label: 'Onboarded' },
    // Assessment
    ASSIGNED: { class: 'badge-info', label: 'Assigned' },
    IN_PROGRESS: { class: 'badge-warning', label: 'In Progress' },
    SUBMITTED: { class: 'badge-purple', label: 'Submitted' },
    PASSED: { class: 'badge-success', label: 'Passed' },
    FAILED: { class: 'badge-danger', label: 'Failed' },
    // Offer (OfferStatus — distinct from ApplicationStatus)
    GENERATED: { class: 'badge-purple', label: 'Generated' },
    SENT: { class: 'badge-info', label: 'Sent' },
    ACCEPTED: { class: 'badge-success', label: 'Accepted' },
    APPROVED: { class: 'badge-teal', label: 'Approved' },
    EXPIRED: { class: 'badge-secondary', label: 'Expired' },
    REJECTED: { class: 'badge-danger', label: 'Rejected' },
    WITHDRAWN: { class: 'badge-secondary', label: 'Withdrawn' },
    // BGV / BGC (BgvStatus)
    PENDING: { class: 'badge-warning', label: 'Pending' },
    NOT_INITIATED: { class: 'badge-secondary', label: 'Not Initiated' },
    INITIATED: { class: 'badge-info', label: 'Initiated' },
    DOCUMENTS_PENDING: { class: 'badge-warning', label: 'Documents Pending' },
    DOCUMENTS_SUBMITTED: { class: 'badge-purple', label: 'Documents Submitted' },
    VERIFICATION_IN_PROGRESS: { class: 'badge-info', label: 'Verification In Progress' },
    RECHECK_REQUIRED: { class: 'badge-orange', label: 'Recheck Required' },
    CLEARED: { class: 'badge-success', label: 'Cleared' },
    ON_HOLD: { class: 'badge-orange', label: 'On Hold' },
    // BGC document status (ACCEPTED shared with the Offer section above)
    PENDING_REVIEW: { class: 'badge-warning', label: 'Pending Review' },
    REUPLOAD_REQUIRED: { class: 'badge-orange', label: 'Reupload Required' },
    // Training
    TRAINING_ASSIGNED: { class: 'badge-info', label: 'Training Assigned' },
    COMPLETED: { class: 'badge-success', label: 'Completed' },
    DROPPED: { class: 'badge-danger', label: 'Dropped' },
    // Selected
    SELECTED: { class: 'badge-teal', label: 'Selected' },
    TRAINING_PENDING: { class: 'badge-warning', label: 'Training Pending' },
    MOVED_TO_TRAINEE: { class: 'badge-purple', label: 'Moved to Trainee' },
    // Asset
    AVAILABLE: { class: 'badge-success', label: 'Available' },
    ASSIGNED_ASSET: { class: 'badge-purple', label: 'Assigned' }, // renamed to avoid overlap
    RETURNED: { class: 'badge-secondary', label: 'Returned' },
    DAMAGED: { class: 'badge-danger', label: 'Damaged' },
    LOST: { class: 'badge-danger', label: 'Lost' },
    UNDER_REPAIR: { class: 'badge-orange', label: 'Under Repair' },
    // Project
    ACTIVE: { class: 'badge-success', label: 'Active' },
    INACTIVE: { class: 'badge-secondary', label: 'Inactive' },
    CLOSED: { class: 'badge-danger', label: 'Closed' },
    DRAFT: { class: 'badge-warning', label: 'Draft' },
    // Employee
    TERMINATED: { class: 'badge-danger', label: 'Terminated' },
    ON_LEAVE: { class: 'badge-orange', label: 'On Leave' },
    // Allocation
    ALLOCATED: { class: 'badge-success', label: 'Allocated' },
    NOT_ALLOCATED: { class: 'badge-warning', label: 'Not Allocated' },
  };

  getBadgeClass(): string {
    return (
      this.STATUS_CONFIG[this.status?.toUpperCase()]?.class ?? 'badge-secondary'
    );
  }

  getLabel(): string {
    if (this.label) return this.label;
    return (
      this.STATUS_CONFIG[this.status?.toUpperCase()]?.label ??
      this.status ??
      'Unknown'
    );
  }
}
