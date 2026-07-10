import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Job } from '../../../models/job.model';
import { JobService } from '../../../services/job.service';
import { CandidateProfileService } from '../../../services/candidate-profile.service';
import { ToastService } from '../../../shared/services/toast.service';
import { isEligibleToApply, eligibilityReason } from '../../../shared/utils/eligibility.util';

@Component({
    selector: 'app-job-details',
    templateUrl: './job-details.component.html',
    styleUrls: ['./job-details.component.scss'],
    standalone: false
})
export class JobDetailsComponent implements OnInit {
  job: Job | null = null;
  loading = false;
  jobId: number = 0;
  profileComplete = false;
  eligible = false;
  ineligibleReason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService,
    private profileService: CandidateProfileService,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.jobId = +params['id'];
      this.loadJobDetails();
    });
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profileComplete = !!profile.profileCompleted;
        this.eligible = isEligibleToApply(profile);
        this.ineligibleReason = eligibilityReason(profile);
      },
      error: () => (this.profileComplete = false),
    });
  }

  loadJobDetails(): void {
    this.loading = true;
    this.jobService.getById(this.jobId).subscribe({
      next: (job) => {
        this.job = job;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading job details:', error);
        this.loading = false;
      }
    });
  }

  applyForJob(): void {
    if (!this.profileComplete) {
      this.toast.warning('Please complete your profile before applying.');
      this.router.navigate(['/candidate/profile']);
      return;
    }
    if (!this.eligible) {
      this.toast.warning(this.ineligibleReason);
      return;
    }
    this.router.navigate(['/candidate/apply', this.jobId]);
  }

  goBack(): void {
    this.router.navigate(['/candidate/jobs']);
  }
}
