import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { JobService } from '../../../services/job.service';
import { ApplicationService } from '../../../services/application.service';
import { CandidateProfileService } from '../../../services/candidate-profile.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Job } from '../../../models/job.model';
import { isEligibleToApply, eligibilityReason } from '../../../shared/utils/eligibility.util';

@Component({
  selector: 'app-jobs-list',
  template: `
    <div class="jobs-page">
      <app-page-header
        title="Hiring Drives"
        subtitle="Browse open hiring drives and apply"
      ></app-page-header>

      <div class="profile-alert" *ngIf="!loading && !profileComplete">
        <mat-icon>info</mat-icon>
        <span
          >Complete your profile before applying to a job.
          <a (click)="goToProfile()">Complete it now</a>.</span
        >
      </div>

      <app-empty-state
        *ngIf="!loading && jobs.length === 0"
        icon="work_off"
        title="No active hiring drives"
        subtitle="Please check back later."
      ></app-empty-state>

      <div class="jobs-grid" *ngIf="jobs.length > 0">
        <mat-card class="job-card" *ngFor="let job of jobs">
          <mat-card-content>
            <div class="job-card-head">
              <div class="logo"><mat-icon>work</mat-icon></div>
              <div>
                <h3>{{ job.jobTitle }}</h3>
                <span class="drive-date" *ngIf="job.driveDate">
                  <mat-icon>event</mat-icon> Drive date: {{ job.driveDate | date: 'mediumDate' }}
                </span>
              </div>
            </div>
            <p class="desc">{{ job.jobDescription }}</p>
            <div class="actions">
              <button
                *ngIf="!isApplied(job.jobId)"
                mat-stroked-button
                color="primary"
                [disabled]="!eligible"
                [matTooltip]="!eligible ? ineligibleReason : ''"
                (click)="apply(job.jobId)"
              >
                Apply for Drive
              </button>
              <button
                *ngIf="isApplied(job.jobId)"
                mat-flat-button
                class="applied-btn"
                matTooltip="You have already applied. View it in My Applications."
                (click)="goToApplications()"
              >
                <mat-icon>check_circle</mat-icon> Applied
              </button>
            </div>
            <p class="ineligible-hint" *ngIf="!eligible && !isApplied(job.jobId)">{{ ineligibleReason }}</p>
          </mat-card-content>
        </mat-card>
      </div>

      <app-loader *ngIf="loading"></app-loader>
    </div>
  `,
  styles: [
    `
      .jobs-page {
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .profile-alert {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: #fef9c3;
        border: 1px solid #fef08a;
        border-radius: 8px;
        color: #854d0e;
        font-size: 13px;
      }
      .profile-alert a {
        color: #4338ca;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
      }
      .jobs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 20px;
      }
      .job-card {
        border-radius: var(--radius-card) !important;
        box-shadow: var(--shadow-card) !important;
      }
      .job-card-head {
        display: flex;
        gap: 12px;
        align-items: center;
        margin-bottom: 12px;
      }
      .logo {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        background: #eef2ff;
        color: #4f46e5;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .job-card-head h3 {
        margin: 0;
        font-size: 17px;
        color: #1e293b;
      }
      .drive-date {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: #4f46e5;
        font-weight: 600;
        margin-top: 2px;
      }
      .drive-date mat-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .desc {
        color: #475569;
        font-size: 14px;
        line-height: 1.5;
        margin: 0 0 16px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .ineligible-hint {
        margin: 8px 0 0;
        font-size: 12px;
        color: #dc2626;
        text-align: right;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
      }
      .applied-btn {
        background: #ecfdf5 !important;
        color: #059669 !important;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .applied-btn mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    `,
  ],
  standalone: false,
})
export class JobsListComponent implements OnInit {
  jobs: Job[] = [];
  loading = false;
  profileComplete = false;
  eligible = false;
  ineligibleReason = '';
  private appliedJobIds = new Set<number>();

  constructor(
    private jobService: JobService,
    private applicationService: ApplicationService,
    private profileService: CandidateProfileService,
    private toast: ToastService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    // Load open jobs, the candidate's own applications, and profile completion
    // status together so we can mark applied jobs and gate the Apply action.
    forkJoin({
      jobs: this.jobService.getAll(),
      applications: this.applicationService.getByUser(0),
      profile: this.profileService.getMyProfile(),
    }).subscribe({
      next: ({ jobs, applications, profile }) => {
        this.jobs = jobs;
        this.appliedJobIds = new Set((applications || []).map((a) => a.jobId));
        this.profileComplete = !!profile.profileCompleted;
        this.eligible = isEligibleToApply(profile);
        this.ineligibleReason = eligibilityReason(profile);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  isApplied(jobId: number): boolean {
    return this.appliedJobIds.has(jobId);
  }

  apply(jobId: number): void {
    if (!this.profileComplete) {
      this.toast.warning('Please complete your profile before applying.');
      this.router.navigate(['/candidate/profile']);
      return;
    }
    if (!this.eligible) {
      this.toast.warning(this.ineligibleReason);
      return;
    }
    this.router.navigate(['/candidate/apply', jobId]);
  }

  goToProfile(): void {
    this.router.navigate(['/candidate/profile']);
  }

  goToApplications(): void {
    this.router.navigate(['/candidate/applications']);
  }
}
