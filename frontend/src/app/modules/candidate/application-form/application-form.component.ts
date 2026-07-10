import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationService } from '../../../services/application.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { JobService } from '../../../services/job.service';
import { CandidateProfileService } from '../../../services/candidate-profile.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Job } from '../../../models/job.model';
import { LoggedInUser } from '../../../models/user.model';
import { CandidateProfileResponse } from '../../../models/candidate-profile.model';
import { isEligibleToApply, eligibilityReason } from '../../../shared/utils/eligibility.util';

@Component({
  selector: 'app-application-form',
  template: `
    <div class="apply-page-wrapper">
      <!-- Left side: Job Info (Sticky) -->
      <div class="job-context-sidebar">
        <button
          mat-icon-button
          class="back-btn"
          (click)="goBack()"
          matTooltip="Back to Job"
        >
          <mat-icon>arrow_back</mat-icon>
        </button>

        <div class="job-context-content" *ngIf="!loading && job">
          <div class="brand-logo">
            <mat-icon>business</mat-icon>
          </div>
          <h1>{{ job.jobTitle }}</h1>
          <p class="company-text">{{ job.companyName || 'NexHire' }}</p>

          <div class="job-meta-tags">
            <span class="tag"
              ><mat-icon>location_on</mat-icon> {{ job.location }}</span
            >
            <span class="tag" *ngIf="job.driveDate"
              ><mat-icon>event</mat-icon> {{ job.driveDate | date: 'mediumDate' }}</span
            >
          </div>

          <div class="about-role">
            <h3>About this role</h3>
            <p>{{ job.jobDescription }}</p>
          </div>

          <div class="skills-section" *ngIf="job.requiredSkills">
            <h3>Required Skills</h3>
            <div class="skills-chips">
              <span
                class="skill-pill"
                *ngFor="let skill of getSkillsArray(job.requiredSkills)"
                >{{ skill }}</span
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Right side: Application Review -->
      <div class="application-form-area">
        <mat-card class="premium-form-card">
          <mat-card-header>
            <mat-card-title>Review &amp; Submit</mat-card-title>
            <mat-card-subtitle
              >We'll apply using the profile details below.</mat-card-subtitle
            >
          </mat-card-header>

          <mat-card-content>
            <div class="form-row two-cols">
              <mat-form-field appearance="outline" class="premium-field">
                <mat-label>Full Name</mat-label>
                <input matInput [value]="user?.fullName" disabled />
                <mat-icon matSuffix class="disabled-icon">lock</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="premium-field">
                <mat-label>Email Address</mat-label>
                <input matInput [value]="user?.email" disabled />
                <mat-icon matSuffix class="disabled-icon">lock</mat-icon>
              </mat-form-field>
            </div>

            <div class="profile-summary-section" *ngIf="profile">
              <h3 class="section-title">Your Profile Summary</h3>
              <div class="profile-summary-grid">
                <div class="summary-item">
                  <strong>Resume</strong>
                  <span>{{ profile.resumeFileName || 'Not uploaded' }}</span>
                </div>
                <div class="summary-item">
                  <strong>Graduation</strong>
                  <span
                    >{{ profile.graduationDegree || '—' }} ·
                    {{ profile.graduationUniversity || '—' }}</span
                  >
                </div>
                <div class="summary-item">
                  <strong>Primary Skills</strong>
                  <span>{{ profile.primarySkills || '—' }}</span>
                </div>
                <div class="summary-item">
                  <strong>Location Preferences</strong>
                  <span>{{
                    profile.locationPreferences?.length
                      ? profile.locationPreferences.join(' > ')
                      : '—'
                  }}</span>
                </div>
              </div>
            </div>

            <div class="alert-box error" *ngIf="alreadyApplied">
              <mat-icon>error_outline</mat-icon>
              <div>
                <strong>Already Applied</strong>
                <p>
                  You have already submitted an application for this role.
                  Please check your dashboard for updates.
                </p>
              </div>
            </div>

            <div class="alert-box warning" *ngIf="!loading && !profileComplete">
              <mat-icon>warning</mat-icon>
              <div>
                <strong>Profile Incomplete</strong>
                <p>
                  Please complete your profile before applying.
                  <a (click)="goToProfile()">Complete it now</a>.
                </p>
              </div>
            </div>

            <div class="alert-box warning" *ngIf="!loading && profileComplete && !eligible">
              <mat-icon>warning</mat-icon>
              <div>
                <strong>Not Eligible</strong>
                <p>{{ ineligibleReason }}</p>
              </div>
            </div>

            <div class="form-actions">
              <button
                mat-raised-button
                class="submit-btn"
                type="button"
                [disabled]="isSubmitting || alreadyApplied || !profileComplete || !eligible"
                (click)="submitApplication()"
              >
                <span *ngIf="!isSubmitting">Submit Application</span>
                <mat-spinner
                  diameter="20"
                  *ngIf="isSubmitting"
                  color="accent"
                ></mat-spinner>
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <app-loader *ngIf="loading"></app-loader>
    </div>
  `,
  styleUrls: ['./application-form.component.scss'],
  standalone: false,
})
export class ApplicationFormComponent implements OnInit {
  user: LoggedInUser | null = null;
  job: Job | null = null;
  profile: CandidateProfileResponse | null = null;
  profileComplete = false;
  eligible = false;
  ineligibleReason = '';
  loading = false;
  isSubmitting = false;
  alreadyApplied = false;
  private jobId = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private currentUserService: CurrentUserService,
    private jobService: JobService,
    private appService: ApplicationService,
    private profileService: CandidateProfileService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      this.jobId = +params['id'];
      this.user = this.currentUserService.getUser();
      if (!this.user?.userId) {
        this.router.navigate(['/candidate/jobs']);
        return;
      }
      this.loadJob();
      this.loadProfile();
      this.checkExistingApplication();
    });
  }

  getSkillsArray(skills: string): string[] {
    return skills?.split(',').map((skill) => skill.trim()) || [];
  }

  loadJob(): void {
    this.loading = true;
    this.jobService.getById(this.jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.profileComplete = !!profile.profileCompleted;
        this.eligible = isEligibleToApply(profile);
        this.ineligibleReason = eligibilityReason(profile);
      },
      error: () => {
        this.profileComplete = false;
      },
    });
  }

  checkExistingApplication(): void {
    if (!this.user?.userId) {
      return;
    }
    this.appService.getByUser(this.user.userId).subscribe((apps) => {
      this.alreadyApplied = apps.some((app) => app.jobId === this.jobId);
    });
  }

  submitApplication(): void {
    if (this.alreadyApplied || !this.profileComplete || !this.eligible) {
      return;
    }
    this.isSubmitting = true;

    const userId = this.user?.userId;
    if (!userId) {
      this.toastService.error('Unable to determine user. Please log in again.');
      this.isSubmitting = false;
      return;
    }

    this.appService
      .apply({
        jobId: this.jobId,
        userId,
      })
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toastService.success(
            'Your application has been submitted successfully.',
          );
          this.router.navigate(['/candidate/applications']);
        },
        error: (err) => {
          this.isSubmitting = false;
          this.toastService.error(
            err.error?.message ||
              'Unable to submit application. Please try again later.',
          );
        },
      });
  }

  goToProfile(): void {
    this.router.navigate(['/candidate/profile']);
  }

  goBack(): void {
    this.router.navigate(['/candidate/jobs']);
  }
}
