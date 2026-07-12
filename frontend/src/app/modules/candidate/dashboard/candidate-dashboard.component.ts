import { Component, OnInit } from '@angular/core';
import { ApplicationService } from '../../../services/application.service';
import { OfferLetterService } from '../../../services/offer-letter.service';
import { CandidateProfileService } from '../../../services/candidate-profile.service';
import { ProjectRmgService, MyProjectAssignment } from '../../../services/project-rmg.service';
import { JoiningLetterService } from '../../../services/joining-letter.service';
import { TraineeProgressService, TraineeRecord } from '../../../services/trainee-progress.service';
import { CurrentUserService } from '../../../core/auth/current-user.service';
import { Application } from '../../../models/application.model';
import { OfferLetter } from '../../../models/offer-letter.model';
import { JoiningLetter } from '../../../models/joining-letter.model';

@Component({
    selector: 'app-candidate-dashboard',
    template: `
    <div class="candidate-dashboard">
      <app-page-header title="Candidate Workspace" subtitle="Manage your applications, test schedules, and offer letters"></app-page-header>

      <div class="profile-banner" *ngIf="profileLoaded && !profileCompleted">
        <mat-icon>info</mat-icon>
        <div class="banner-text">
          <strong>Complete your profile to start applying</strong>
          <span>Personal details, academics, skills, resume, and 3 location preferences are required.</span>
        </div>
        <button mat-raised-button color="primary" routerLink="/candidate/profile">Complete Profile</button>
      </div>

      <!-- Welcome Card -->
      <mat-card class="welcome-card">
        <mat-card-content>
          <div class="welcome-grid">
            <div class="welcome-text">
              <h2>Welcome, {{ user?.fullName }}!</h2>
              <p>NexHire streamlines your recruitment journey. Find new hiring drives, view real-time assessment statuses, and check background verification updates all in one portal.</p>
              <button mat-raised-button color="accent" routerLink="/candidate/jobs">Browse Hiring Drives</button>
            </div>
            <div class="welcome-stats">
              <div class="stat-box">
                <span class="stat-num">{{ applications.length }}</span>
                <span class="stat-lbl">Applications</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ getPassedCount() }}</span>
                <span class="stat-lbl">Assessments Passed</span>
              </div>
              <div class="stat-box">
                <span class="stat-num">{{ offers.length }}</span>
                <span class="stat-lbl">Offers Issued</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Joining Details (P-Claude.md candidate dashboard card) -->
      <mat-card class="project-card" *ngIf="joiningLetter">
        <mat-card-header>
          <mat-card-title>Joining Details</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="project-grid">
            <div class="project-field">
              <span class="field-lbl">Batch</span>
              <span class="field-val">{{ joiningLetter.batchCode || '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Joining Date</span>
              <span class="field-val">{{ joiningLetter.joiningDate | date }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Location</span>
              <span class="field-val">{{ joiningLetter.locationName || '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Status</span>
              <app-status-badge [status]="joiningLetter.status"></app-status-badge>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Training Status (P-Claude.md candidate dashboard card) -->
      <mat-card class="project-card" *ngIf="training">
        <mat-card-header>
          <mat-card-title>Training Status</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="project-grid">
            <div class="project-field">
              <span class="field-lbl">Batch</span>
              <span class="field-val">{{ training.batchCode || '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Attendance</span>
              <span class="field-val">{{ training.attendancePercentage != null ? training.attendancePercentage + '%' : '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Score</span>
              <span class="field-val">{{ training.score != null ? training.score : '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Result</span>
              <app-status-badge [status]="training.finalResult || 'IN_PROGRESS'"></app-status-badge>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- My Project (P-Claude.md: Project Name, Technology, Location, Allocation Date, Status) -->
      <mat-card class="project-card" *ngIf="myProject">
        <mat-card-header>
          <mat-card-title>My Project</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="project-grid">
            <div class="project-field">
              <span class="field-lbl">Project Name</span>
              <span class="field-val">{{ myProject.projectName }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Technology</span>
              <span class="field-val">{{ myProject.technology || '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Location</span>
              <span class="field-val">{{ myProject.locationName || '—' }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Allocation Date</span>
              <span class="field-val">{{ myProject.assignedAt | date }}</span>
            </div>
            <div class="project-field">
              <span class="field-lbl">Status</span>
              <app-status-badge [status]="myProject.projectStatus || 'ACTIVE'"></app-status-badge>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Applications and Actions Grid -->
      <div class="dashboard-grid">
        <!-- Recent Applications -->
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>My Applications</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state *ngIf="applications.length === 0" icon="assignment" title="No applications yet" subtitle="Start applying to jobs to track status here."></app-empty-state>
            <div class="recent-list" *ngIf="applications.length > 0">
              <div class="list-item" *ngFor="let app of applications">
                <div class="item-details">
                  <h4>{{ app.jobTitle }}</h4>
                  <span>Applied on: {{ app.appliedDate | date }}</span>
                </div>
                <app-status-badge [status]="app.status"></app-status-badge>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Recent Offer Letters -->
        <mat-card class="grid-card">
          <mat-card-header>
            <mat-card-title>Offer Letters</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <app-empty-state *ngIf="offers.length === 0" icon="mail" title="No offers yet" subtitle="Completed assessments will trigger offer generation."></app-empty-state>
            <div class="recent-list" *ngIf="offers.length > 0">
              <div class="list-item pointer" *ngFor="let offer of offers" routerLink="/candidate/offers">
                <div class="item-details">
                  <h4>{{ offer.jobTitle }}</h4>
                  <span *ngIf="offer.generatedAt">Generated {{ offer.generatedAt | date }}</span>
                </div>
                <app-status-badge [status]="offer.status"></app-status-badge>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
    styles: [`
    .candidate-dashboard {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .profile-banner {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: #fef9c3;
      border: 1px solid #fef08a;
      border-radius: 12px;
      color: #854d0e;
    }
    .profile-banner .banner-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      font-size: 13px;
    }
    .profile-banner .banner-text strong {
      font-size: 14px;
    }
    .welcome-card {
      background: linear-gradient(135deg, #3f51b5, #5c6bc0) !important;
      color: white !important;
      border-radius: var(--radius-card) !important;
      overflow: hidden;
    }
    .welcome-grid {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      flex-wrap: wrap;
      gap: 32px;
    }
    .welcome-text {
      flex: 2;
      min-width: 300px;
    }
    .welcome-text h2 {
      margin: 0 0 8px;
      font-size: 26px;
      font-weight: 700;
    }
    .welcome-text p {
      margin: 0 0 24px;
      line-height: 1.5;
      color: #e0e7ff;
    }
    .welcome-stats {
      display: flex;
      gap: 16px;
      flex: 1;
      justify-content: flex-end;
      min-width: 280px;
    }
    .stat-box {
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 16px;
      min-width: 90px;
      text-align: center;
      flex: 1;
    }
    .stat-num {
      display: block;
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .stat-lbl {
      font-size: 11px;
      color: #e0e7ff;
      text-transform: uppercase;
      font-weight: 600;
    }
    .project-card {
      border-radius: var(--radius-card) !important;
      box-shadow: var(--shadow-card) !important;
    }
    .project-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      padding-top: 8px;
    }
    .project-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .field-lbl {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.03em;
    }
    .field-val {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 24px;
    }
    .grid-card {
      border-radius: var(--radius-card) !important;
      box-shadow: var(--shadow-card) !important;
    }
    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 12px;
    }
    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      transition: background-color 0.2s;
    }
    .list-item:hover {
      background-color: #f1f5f9;
    }
    .pointer {
      cursor: pointer;
    }
    .item-details h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .item-details span {
      font-size: 12px;
      color: #64748b;
    }
  `],
    standalone: false
})

export class CandidateDashboardComponent implements OnInit {
  user: any = null;
  applications: Application[] = [];
  offers: OfferLetter[] = [];
  profileCompleted = false;
  profileLoaded = false;
  myProject: MyProjectAssignment | null = null;
  joiningLetter: JoiningLetter | null = null;
  training: TraineeRecord | null = null;

  constructor(
    private currentUserService: CurrentUserService,
    private appService: ApplicationService,
    private offerService: OfferLetterService,
    private profileService: CandidateProfileService,
    private projectService: ProjectRmgService,
    private joiningLetterService: JoiningLetterService,
    private trainingService: TraineeProgressService,
  ) {}

  ngOnInit(): void {
    this.user = this.currentUserService.getUser();
    if (this.user?.userId) {
      this.appService.getByUser(this.user.userId).subscribe(apps => this.applications = apps);
      this.offerService.getByUser(this.user.userId).subscribe(offs => this.offers = offs);
      this.profileService.getMyProfile().subscribe({
        next: (profile) => {
          this.profileCompleted = !!profile.profileCompleted;
          this.profileLoaded = true;
        },
        error: () => {
          this.profileLoaded = true;
        },
      });
      this.projectService.getMyProject().subscribe({
        next: (project) => (this.myProject = project),
        error: () => (this.myProject = null),
      });
      this.joiningLetterService.getMine().subscribe({
        next: (letters) => (this.joiningLetter = letters.length > 0 ? letters[0] : null),
        error: () => (this.joiningLetter = null),
      });
      this.trainingService.getMyTraining().subscribe({
        next: (record) => (this.training = record),
        error: () => (this.training = null),
      });
    }
  }

  getPassedCount(): number {
    return this.applications.filter(a => a.assessmentStatus === 'PASSED').length;
  }
}
