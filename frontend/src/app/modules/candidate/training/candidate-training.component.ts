import { Component, OnInit } from '@angular/core';
import {
  TraineeProgressService,
  TraineeRecord,
} from '../../../services/trainee-progress.service';

@Component({
  selector: 'app-candidate-training',
  template: `
    <div class="candidate-training">
      <app-page-header
        title="My Training"
        subtitle="Track your onboarding training progress"
      ></app-page-header>

      <app-empty-state
        *ngIf="!record && loaded"
        icon="school"
        title="No training record yet"
        subtitle="Accept your joining letter to begin training."
      ></app-empty-state>

      <mat-card class="training-card" *ngIf="record">
        <mat-card-header>
          <mat-icon mat-card-avatar class="t-icon">school</mat-icon>
          <mat-card-title>{{ record.jobTitle }}</mat-card-title>
          <mat-card-subtitle
            >Status: {{ record.applicationStatus }}</mat-card-subtitle
          >
        </mat-card-header>
        <mat-card-content>
          <div class="progress-block" *ngIf="record.score != null || record.attendancePercentage != null">
            <p class="topic" *ngIf="record.score != null">
              Assessment score: <strong>{{ record.score }}</strong>
            </p>
            <p class="topic" *ngIf="record.attendancePercentage != null">
              Attendance: <strong>{{ record.attendancePercentage }}%</strong>
            </p>
          </div>
          <p class="done" *ngIf="record.released">
            Training completed — released for project allocation.
          </p>
          <div class="lap-banner" *ngIf="record.applicationStatus === 'LAP'">
            <mat-icon>support</mat-icon>
            <div>
              <strong>You've been enrolled in the Learning Assistance Program (LAP)</strong>
              <p>
                Your training results were below the required cutoff. HR has
                enrolled you in LAP to help you meet the requirements — you'll
                get additional support and another opportunity to qualify.
                Reach out to your HR contact for details on next steps.
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .candidate-training {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .training-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
        padding: 16px;
        max-width: 600px;
      }
      .t-icon {
        color: #4f46e5;
      }
      .progress-block {
        margin: 16px 0;
      }
      .progress-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
        font-size: 14px;
        color: #475569;
      }
      .pct {
        font-weight: 700;
        color: #1e293b;
      }
      .topic {
        color: #475569;
        margin-top: 12px;
      }
      .done {
        color: #16a34a;
        font-weight: 600;
        margin-top: 8px;
      }
      .lap-banner {
        display: flex;
        gap: 12px;
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 10px;
        background: #fff7ed;
        border: 1px solid #fed7aa;
        color: #9a3412;
      }
      .lap-banner mat-icon {
        color: #ea580c;
        flex-shrink: 0;
      }
      .lap-banner strong {
        display: block;
        margin-bottom: 4px;
      }
      .lap-banner p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: #9a3412;
      }
    `,
  ],
  standalone: false,
})
export class CandidateTrainingComponent implements OnInit {
  record: TraineeRecord | null = null;
  loaded = false;

  constructor(private training: TraineeProgressService) {}

  ngOnInit(): void {
    this.training.getMyTraining().subscribe({
      next: (r) => {
        this.record = r;
        this.loaded = true;
      },
      error: () => {
        this.record = null;
        this.loaded = true;
      },
    });
  }
}
