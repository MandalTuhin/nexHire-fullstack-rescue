import { Component, OnInit } from '@angular/core';
import { ApplicationService } from '../../../services/application.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { Application, ApplicationStatus } from '../../../models/application.model';

interface TimelineEvent {
  label: string;
  state: 'done' | 'current' | 'pending' | 'failed' | 'declined' | 'lap';
  timestamp?: string;
  note?: string;
}

/** Ordered pipeline stages + which application statuses map to each. Index = stage
 *  position; a status not explicitly listed for a stage still marks earlier stages done. */
const JOURNEY_STAGES = ['Applied', 'Assessment', 'Offer', 'Background Check', 'Joining', 'Training', 'Released'];

const STAGE_OF_STATUS: Record<string, number> = {
  APPLIED: 0,
  ASSESSMENT_ASSIGNED: 1,
  ASSESSMENT_SCORE_UPLOADED: 1,
  ASSESSMENT_PASSED: 1,
  ASSESSMENT_FAILED: 1,
  OFFER_GENERATED: 2,
  OFFER_SENT: 2,
  OFFER_ACCEPTED: 2,
  OFFER_REJECTED: 2,
  BGC_INITIATED: 3,
  BGC_DOCUMENTS_PENDING: 3,
  BGC_DOCUMENTS_SUBMITTED: 3,
  BGC_VERIFICATION_IN_PROGRESS: 3,
  BGC_CLEARED: 3,
  BGC_FAILED: 3,
  EMPLOYEE_CREATED: 3,
  SELECTED_USER_CREATED: 3,
  JOINING_BATCH_ASSIGNED: 4,
  JOINING_LETTER_GENERATED: 4,
  JOINING_LETTER_SENT: 4,
  JOINING_ON_HOLD: 4,
  JOINING_ACCEPTED: 4,
  JOINING_REJECTED: 4,
  TRAINING_ASSIGNED: 5,
  TRAINING_IN_PROGRESS: 5,
  TRAINING_RESULT_UPLOADED: 5,
  TRAINING_COMPLETED: 5,
  LAP: 5,
  COMPLETED_WITH_EXCEPTIONS: 5,
  RELEASED: 6,
  PROJECT_ASSIGNED: 6,
  ONBOARDED: 6,
};

const FAILED_STATUSES = new Set(['ASSESSMENT_FAILED', 'BGC_FAILED']);
const DECLINED_STATUSES = new Set(['OFFER_REJECTED', 'JOINING_REJECTED']);

@Component({
  selector: 'app-candidate-applications',
  template: `
    <div class="track-application">
      <app-page-header
        title="Track My Application"
        subtitle="See exactly where your hiring drive application stands"
      ></app-page-header>

      <app-empty-state
        *ngIf="loaded && !application"
        icon="assignment"
        title="No application yet"
        subtitle="Apply to the open hiring drive to start tracking your progress here."
      ></app-empty-state>

      <mat-card class="tracker-card" *ngIf="application">
        <mat-card-header>
          <mat-card-title>{{ application.jobTitle }}</mat-card-title>
          <mat-card-subtitle>Applied on {{ application.appliedDate | date: 'mediumDate' }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="v-timeline">
            <div class="v-timeline-row" *ngFor="let event of timeline; let last = last">
              <div class="v-time-col">
                <span class="v-time" *ngIf="event.timestamp">{{ event.timestamp | date: 'shortTime' }}</span>
                <span class="v-date" *ngIf="event.timestamp">{{ event.timestamp | date: 'mediumDate' }}</span>
              </div>
              <div class="v-marker-col">
                <div
                  class="v-marker"
                  [class.done]="event.state === 'done'"
                  [class.current]="event.state === 'current'"
                  [class.flag]="event.state === 'failed' || event.state === 'declined' || event.state === 'lap'"
                >
                  <mat-icon *ngIf="event.state === 'done'">check</mat-icon>
                  <mat-icon *ngIf="event.state === 'failed'">close</mat-icon>
                  <mat-icon *ngIf="event.state === 'declined'">remove</mat-icon>
                  <mat-icon *ngIf="event.state === 'lap'">support</mat-icon>
                </div>
                <div class="v-connector" *ngIf="!last"></div>
              </div>
              <div class="v-event-card">
                <strong>{{ event.label }}</strong>
                <span class="v-status" [ngClass]="'status-' + event.state">{{ statusLabel(event.state) }}</span>
                <span class="v-note" *ngIf="event.note">{{ event.note }}</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .track-application {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
      }
      .tracker-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }

      .v-timeline {
        display: flex;
        flex-direction: column;
        margin-top: 8px;
      }
      .v-timeline-row {
        display: grid;
        grid-template-columns: 100px 40px 1fr;
        column-gap: 16px;
      }
      .v-time-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        padding-top: 6px;
        text-align: right;
      }
      .v-time {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text);
      }
      .v-date {
        font-size: 11px;
        color: var(--color-text-muted);
      }
      .v-marker-col {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .v-marker {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--color-border-light);
        color: var(--color-text-faint);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      .v-marker.done {
        background: var(--color-success);
        color: white;
      }
      .v-marker.current {
        background: var(--color-primary);
        color: white;
      }
      .v-marker.flag {
        background: var(--color-warning);
        color: white;
      }
      .v-connector {
        width: 2px;
        flex: 1;
        min-height: 36px;
        background: var(--color-border);
        margin: 2px 0;
      }
      .v-event-card {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 16px;
        margin-bottom: 16px;
        border: 1px solid var(--color-border);
        border-radius: 10px;
        background: var(--color-surface-muted);

        strong {
          font-size: 14px;
          color: var(--color-text);
        }
      }
      .v-status {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }
      .status-done {
        color: var(--color-success);
      }
      .status-current {
        color: var(--color-primary);
      }
      .status-pending {
        color: var(--color-text-faint);
      }
      .status-failed,
      .status-declined {
        color: var(--color-danger);
      }
      .status-lap {
        color: var(--color-warning);
      }
      .v-note {
        font-size: 12px;
        color: var(--color-text-secondary);
      }
    `,
  ],
  standalone: false,
})
export class CandidateApplicationsComponent implements OnInit {
  applications: Application[] = [];
  application: Application | null = null;
  timeline: TimelineEvent[] = [];
  loaded = false;

  constructor(
    private appService: ApplicationService,
    private currentUserService: CurrentUserService,
  ) {}

  ngOnInit(): void {
    const user = this.currentUserService.getUser();
    if (!user?.userId) {
      this.loaded = true;
      return;
    }
    this.appService.getByUser(user.userId).subscribe({
      next: (apps) => {
        this.applications = apps;
        this.application = this.mostAdvanced(apps);
        this.timeline = this.application ? this.buildTimeline(this.application) : [];
        this.loaded = true;
      },
      error: () => {
        this.loaded = true;
      },
    });
  }

  statusLabel(state: TimelineEvent['state']): string {
    switch (state) {
      case 'done':
        return 'Completed';
      case 'current':
        return 'In Progress';
      case 'failed':
        return 'Not Cleared';
      case 'declined':
        return 'Declined';
      case 'lap':
        return 'In LAP';
      default:
        return 'Pending';
    }
  }

  private mostAdvanced(apps: Application[]): Application | null {
    if (!apps.length) return null;
    return apps.reduce((best, a) => {
      const bestStage = STAGE_OF_STATUS[best.status] ?? 0;
      const stage = STAGE_OF_STATUS[a.status] ?? 0;
      return stage >= bestStage ? a : best;
    }, apps[0]);
  }

  /** Builds the 7-stage vertical timeline. Only "Applied" carries a real per-stage
   *  timestamp (appliedDate) — later stages use the application's updatedAt as the best
   *  available approximation of "when this stage was reached" once it's done/current. */
  private buildTimeline(app: Application): TimelineEvent[] {
    const status = app.status as ApplicationStatus;
    const currentStage = STAGE_OF_STATUS[status] ?? 0;
    const isFailed = FAILED_STATUSES.has(status);
    const isDeclined = DECLINED_STATUSES.has(status);
    const isLap = status === 'LAP';
    const isFullyReleased = currentStage === 6;

    return JOURNEY_STAGES.map((label, index) => {
      const timestamp = index === 0 ? app.appliedDate : index <= currentStage ? app.updatedAt : undefined;

      if (index < currentStage) {
        return { label, state: 'done', timestamp } as TimelineEvent;
      }
      if (index === currentStage) {
        if (isFullyReleased) return { label, state: 'done', timestamp } as TimelineEvent;
        if (isFailed) return { label, state: 'failed', timestamp, note: 'Not cleared' } as TimelineEvent;
        if (isDeclined) return { label, state: 'declined', timestamp, note: 'Declined' } as TimelineEvent;
        if (isLap) return { label, state: 'lap', timestamp, note: 'Enrolled in Learning Assistance Program' } as TimelineEvent;
        return { label, state: 'current', timestamp } as TimelineEvent;
      }
      return { label, state: 'pending' } as TimelineEvent;
    });
  }
}
