import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { finalize, forkJoin } from 'rxjs';
import { JoiningBatchService, ActivityLogEntry } from '../../services/joining-batch.service';
import { TrainingBatchService } from '../../services/training-batch.service';
import { CityAdminService } from '../../services/city-admin.service';
import { BlockAdminService } from '../../services/block-admin.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { BulkAction } from '../../shared/components/bulk-action-bar/bulk-action-bar.component';
import { BlockAdmin, CityAdmin } from '../../models/city-admin.model';
import { EligibleJoiningCandidate, JoiningBatch, JoiningBatchMember } from '../../models/joining-batch.model';
import { TraineeDetail, TrainingBatchDetail, TrainingProgram } from '../../models/training-batch.model';
import { UploadSummary } from '../../models/bulk-upload.model';

type ViewMode = 'list' | 'wizard' | 'detail';

/** Batch-list row: JoiningBatch (accurate membership/headcount across the whole lifecycle) with
 *  Released/LAP counts merged in from the Training Batch Dashboard endpoint (only meaningful
 *  once training has started — legitimately 0 before then, not a display bug). */
interface BatchListRow extends JoiningBatch {
  releasedCount: number;
  lapCount: number;
}

/** Batch statuses where the batch is fully done and read-only — no further HR action applies. */
const TERMINAL_BATCH_STATUSES = new Set(['COMPLETED', 'CLOSED', 'CANCELLED']);

/** Statuses eligible for HR to remove-and-replace before training starts. */
const REPLACEABLE_STATUSES = new Set(['JOINING_REJECTED', 'JOINING_EXPIRED']);

/** Batch statuses where membership can still be modified — mirrors the backend's
 *  CANCELLABLE_STATUSES guard (JoiningBatchService), so the UI doesn't invite an action the
 *  server would reject anyway. */
const MODIFIABLE_BATCH_STATUSES = new Set(['CREATED', 'JOINING_LETTER_SENT', 'JOINING_ACCEPTANCE_IN_PROGRESS', 'READY_FOR_TRAINING']);

@Component({
  selector: 'app-joining-batches',
  templateUrl: './joining-batches.component.html',
  styleUrls: ['./joining-batches.component.scss'],
  standalone: false,
})
export class JoiningBatchesComponent implements OnInit {
  view: ViewMode = 'list';

  batches: BatchListRow[] = [];
  loading = false;
  loadError = false;

  locations: CityAdmin[] = [];
  wizardBlocks: BlockAdmin[] = [];
  loadingBlocks = false;

  // Wizard state
  wizardStep = 0;
  detailsForm!: FormGroup;
  trainingForm!: FormGroup;
  sizeForm!: FormGroup;
  eligible: EligibleJoiningCandidate[] = [];
  loadingEligible = false;
  selected = new Set<number>();
  creating = false;
  readonly todayIso = new Date();

  // Detail view state
  selectedBatch: JoiningBatch | null = null;
  loadingDetail = false;
  detailLoadError = false;
  detailBatchId: number | null = null;
  sending = false;

  // Remove & Replace
  showAddReplacement = false;
  replacementEligible: EligibleJoiningCandidate[] = [];
  loadingReplacementEligible = false;
  selectedReplacements = new Set<number>();
  addingReplacements = false;
  removingMemberId: number | null = null;
  resendingMemberId: number | null = null;

  // Training assignment / LAP / release / trainee results
  trainingPrograms: TrainingProgram[] = [];
  selectedTrainingProgramId: number | null = null;
  assigning = false;
  trainees: TraineeDetail[] = [];
  assignedTrainingName: string | null = null;
  completing = false;
  closing = false;

  // Trainee search + bulk selection
  traineeSearch = '';
  selectedTrainees = new Set<number>();
  bulkActing = false;
  readonly traineeBulkActions: BulkAction[] = [
    { id: 'lap', label: 'Move to LAP', icon: 'support', color: 'warn' },
    { id: 'release', label: 'Release', icon: 'check_circle', color: 'primary' },
    { id: 'flag', label: 'Flag', icon: 'flag', color: 'warn' },
  ];

  lapDialogTrainee: TraineeDetail | null = null;
  lapBulkIds: number[] | null = null;
  lapRemarks = '';

  flagDialogTrainee: TraineeDetail | null = null;
  flagBulkIds: number[] | null = null;
  flagReason = '';

  excelFile: File | null = null;
  validatingExcel = false;
  committingExcel = false;
  excelPreview: UploadSummary | null = null;
  excelHistory: UploadSummary[] = [];
  showExcelHistory = false;

  exporting = false;

  activityLog: ActivityLogEntry[] = [];
  loadingActivity = false;
  showActivity = false;

  constructor(
    private fb: FormBuilder,
    private batchService: JoiningBatchService,
    private trainingBatchService: TrainingBatchService,
    private cityService: CityAdminService,
    private blockAdminService: BlockAdminService,
    private toastService: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadBatches();
    this.cityService.getAll().subscribe((locs) => (this.locations = locs));
    this.trainingBatchService.getPrograms().subscribe((p) => (this.trainingPrograms = p));
  }

  private buildForms(): void {
    this.detailsForm = this.fb.group({
      joiningDate: [null, [Validators.required, this.notPastDateValidator()]],
      joiningLocationId: [null, Validators.required],
    });
    this.trainingForm = this.fb.group(
      {
        trainingLocationId: [null, Validators.required],
        trainingProgramId: [null, Validators.required],
        trainingBlockId: [null],
        trainingStartDate: [null, Validators.required],
        trainingEndDate: [null, Validators.required],
      },
      { validators: this.trainingDateOrderValidator() },
    );
    this.sizeForm = this.fb.group({
      batchSize: [60, [Validators.required, Validators.min(1)]],
    });
    this.wizardBlocks = [];
    this.trainingForm.get('trainingLocationId')!.valueChanges.subscribe((cityId) => {
      this.trainingForm.get('trainingBlockId')!.setValue(null);
      this.loadWizardBlocks(cityId);
    });
  }

  /** HR should never be able to pick a past joining date. */
  private notPastDateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value: Date | string | null = control.value;
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date < today ? { pastDate: true } : null;
    };
  }

  /** Training start must be after the joining date; training end must be after training
   *  start. Cross-field, so it lives on trainingForm as a group validator reading
   *  detailsForm's joiningDate too. */
  private trainingDateOrderValidator() {
    return (group: AbstractControl): ValidationErrors | null => {
      const start: Date | string | null = group.get('trainingStartDate')?.value;
      const end: Date | string | null = group.get('trainingEndDate')?.value;
      const joining: Date | string | null = this.detailsForm?.get('joiningDate')?.value;
      const endControl = group.get('trainingEndDate');
      const startControl = group.get('trainingStartDate');

      const startExisting = startControl?.errors ?? {};
      const { afterJoining, ...startRest } = startExisting;
      if (joining && start && new Date(start) <= new Date(joining)) {
        startControl?.setErrors({ ...startRest, afterJoining: true });
      } else {
        startControl?.setErrors(Object.keys(startRest).length ? startRest : null);
      }

      const endExisting = endControl?.errors ?? {};
      const { afterStart, ...endRest } = endExisting;
      if (start && end && new Date(end) <= new Date(start)) {
        endControl?.setErrors({ ...endRest, afterStart: true });
      } else {
        endControl?.setErrors(Object.keys(endRest).length ? endRest : null);
      }
      return null;
    };
  }

  private loadWizardBlocks(cityId: number | null): void {
    this.wizardBlocks = [];
    if (!cityId) return;
    this.loadingBlocks = true;
    this.blockAdminService.getAll(cityId, true).subscribe({
      next: (list) => {
        this.wizardBlocks = list;
        this.loadingBlocks = false;
      },
      error: () => {
        this.loadingBlocks = false;
      },
    });
  }

  loadBatches(): void {
    this.loading = true;
    this.loadError = false;
    forkJoin({
      list: this.batchService.getAll(),
      dashboard: this.trainingBatchService.getDashboard(),
    }).subscribe({
      next: ({ list, dashboard }) => {
        const statsById = new Map(dashboard.map((d) => [d.id, d]));
        this.batches = list
          .map((b) => ({
            ...b,
            releasedCount: statsById.get(b.id)?.releasedCount ?? 0,
            lapCount: statsById.get(b.id)?.lapCount ?? 0,
          }))
          .sort((a, b) => b.id - a.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError = true;
      },
    });
  }

  // ─── Wizard ─────────────────────────────────────────────────────────────────

  startWizard(): void {
    this.view = 'wizard';
    this.wizardStep = 0;
    this.selected.clear();
    this.eligible = [];
    this.buildForms();
  }

  cancelWizard(): void {
    this.view = 'list';
  }

  goToEligibleStep(): void {
    if (this.detailsForm.invalid || this.trainingForm.invalid || this.sizeForm.invalid) {
      this.detailsForm.markAllAsTouched();
      this.trainingForm.markAllAsTouched();
      this.sizeForm.markAllAsTouched();
      this.toastService.error('Please complete all required fields.');
      return;
    }
    this.wizardStep = 3;
    this.loadEligible();
  }

  private loadEligible(): void {
    const joiningLocationId = this.detailsForm.value.joiningLocationId;
    this.loadingEligible = true;
    this.batchService.getEligible(joiningLocationId).subscribe({
      next: (list) => {
        this.eligible = list;
        this.loadingEligible = false;
        // Pre-select up to batchSize — already sorted location-match first, then by
        // assessment score descending within each match tier (see backend).
        const size = this.sizeForm.value.batchSize;
        this.selected = new Set(list.slice(0, size).map((c) => c.applicationId));
      },
      error: () => {
        this.loadingEligible = false;
      },
    });
  }

  toggleCandidate(applicationId: number): void {
    if (this.selected.has(applicationId)) {
      this.selected.delete(applicationId);
    } else {
      if (this.selected.size >= this.sizeForm.value.batchSize) {
        this.toastService.warning(
          `Batch capacity is ${this.sizeForm.value.batchSize}. Please select only ${this.sizeForm.value.batchSize} candidates or create multiple batches.`,
        );
        return;
      }
      this.selected.add(applicationId);
    }
  }

  get overCapacity(): boolean {
    return this.selected.size > this.sizeForm.value.batchSize;
  }

  confirmCreate(): void {
    if (this.selected.size === 0) {
      this.toastService.error('Select at least one candidate.');
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Create Joining Batch',
        message: `Create a batch with ${this.selected.size} candidate(s)? This will move them out of the eligible pool immediately.`,
        type: 'info',
        confirmText: 'Create Batch',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm) return;
      this.creating = true;
      const d = this.detailsForm.value;
      const t = this.trainingForm.value;
      const s = this.sizeForm.value;
      const program = this.trainingPrograms.find((p) => p.id === t.trainingProgramId);
      this.batchService
        .create({
          joiningDate: this.toIso(d.joiningDate)!,
          joiningLocationId: d.joiningLocationId,
          trainingLocationId: t.trainingLocationId,
          trainingProgram: program?.name,
          trainingProgramId: t.trainingProgramId,
          trainingBlockId: t.trainingBlockId || undefined,
          trainingStartDate: this.toIso(t.trainingStartDate),
          trainingEndDate: this.toIso(t.trainingEndDate),
          batchSize: s.batchSize,
          applicationIds: Array.from(this.selected),
        })
        .subscribe({
          next: (batch) => {
            this.creating = false;
            this.toastService.success(`Batch ${batch.batchCode} (${batch.batchName}) created with ${batch.currentHeadcount} candidate(s).`);
            this.loadBatches();
            this.openDetail(batch.id);
          },
          error: () => {
            this.creating = false;
          },
        });
    });
  }

  getLocationName(id: number | null): string {
    return this.locations.find((l) => l.id === id)?.name ?? '';
  }

  private toIso(value: Date | string | null): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ─── Detail ─────────────────────────────────────────────────────────────────

  openDetail(id: number): void {
    this.view = 'detail';
    this.detailBatchId = id;
    this.loadingDetail = true;
    this.detailLoadError = false;
    this.selectedTrainingProgramId = null;
    this.excelPreview = null;
    this.excelFile = null;
    this.showExcelHistory = false;
    this.showAddReplacement = false;
    this.selectedReplacements.clear();
    this.selectedTrainees.clear();
    this.traineeSearch = '';
    this.showActivity = false;
    this.trainingBatchService.getDetail(id).subscribe({
      next: (d: TrainingBatchDetail) => {
        this.selectedBatch = d.batch;
        this.trainees = d.trainees;
        this.assignedTrainingName = d.assignedTrainingName ?? null;
        this.loadingDetail = false;
      },
      error: () => {
        this.loadingDetail = false;
        // Keep any previously-loaded batch visible on a refresh failure (the global error
        // toast already reported it); only show the dedicated error state when there's nothing
        // to fall back on, so a failed load never renders as a silent blank page.
        if (!this.selectedBatch) this.detailLoadError = true;
      },
    });
  }

  private refreshDetail(): void {
    if (this.selectedBatch) this.openDetail(this.selectedBatch.id);
  }

  backToList(): void {
    this.view = 'list';
    this.selectedBatch = null;
    this.trainees = [];
  }

  // ─── Batch Summary KPIs (detail page) ────────────────────────────────────────

  get kpiTotalTrainees(): number {
    return this.trainees.length;
  }

  get kpiReleasedCount(): number {
    return this.trainees.filter((t) => t.released).length;
  }

  get kpiLapCount(): number {
    return this.trainees.filter((t) => !t.released && t.lapEnabled).length;
  }

  get kpiFlaggedCount(): number {
    return this.trainees.filter((t) => !t.released && !!t.flagReason).length;
  }

  isFlagged(trainee: TraineeDetail): boolean {
    return !!trainee.flagReason?.trim();
  }

  canMoveToLap(trainee: TraineeDetail): boolean {
    return !trainee.released && !this.isFlagged(trainee) && !trainee.lapEnabled;
  }

  canRemoveFromLap(trainee: TraineeDetail): boolean {
    return !trainee.released && !this.isFlagged(trainee) && trainee.lapEnabled;
  }

  canRelease(trainee: TraineeDetail): boolean {
    return !trainee.released && !this.isFlagged(trainee)
      && (trainee.finalResult === 'PASSED' || trainee.finalResult === 'COMPLETED');
  }

  canFlag(trainee: TraineeDetail): boolean {
    return !trainee.released && !this.isFlagged(trainee)
      && (trainee.lapEnabled || trainee.finalResult === 'FAILED' || trainee.finalResult === 'LAP');
  }

  /** Batch is fully done — read-only, no further HR action applies. */
  get isTerminal(): boolean {
    return !!this.selectedBatch && TERMINAL_BATCH_STATUSES.has(this.selectedBatch.status);
  }

  /** Once Complete Batch has run (COMPLETED/RELEASE_PENDING_LAP/CLOSED), uploading more results
   *  against this batch no longer makes sense — training itself is over. */
  get assessmentUploadAvailable(): boolean {
    return !!this.selectedBatch && ['TRAINING_IN_PROGRESS', 'RELEASE_PENDING_LAP', 'COMPLETED_WITH_EXCEPTIONS']
      .includes(this.selectedBatch.status);
  }

  get isLapReassessmentUpload(): boolean {
    return !!this.selectedBatch && ['RELEASE_PENDING_LAP', 'COMPLETED_WITH_EXCEPTIONS']
      .includes(this.selectedBatch.status);
  }

  get missingResultCount(): number {
    return this.trainees.filter((t) => !t.released && !this.isFlagged(t) && t.finalResult === 'PENDING').length;
  }

  // ─── Joining Letters (unified generate + send) ───────────────────────────────

  /** True while at least one member still needs a letter — governs whether the single
   *  "Send Joining Letter" action is shown on an existing batch's detail page. */
  get hasPendingLetters(): boolean {
    return !!this.selectedBatch?.members?.some((m) => m.joiningLetterStatus === 'NOT_GENERATED');
  }

  sendLetters(): void {
    if (!this.selectedBatch) return;
    const pendingCount = (this.selectedBatch.members || []).filter((m) => m.joiningLetterStatus === 'NOT_GENERATED').length;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Send Joining Letter',
        message: `Generate and send the joining letter to ${pendingCount} candidate(s) who don't have one yet? This also reserves the training budget for them.`,
        type: 'info',
        confirmText: 'Send',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm || !this.selectedBatch) return;
      this.sending = true;
      this.batchService.sendLetters(this.selectedBatch.id).subscribe({
        next: (b) => {
          this.sending = false;
          this.selectedBatch = b;
          this.toastService.success('Joining letter sent.');
          this.loadBatches();
        },
        error: () => {
          this.sending = false;
        },
      });
    });
  }

  // ─── Remove & Replace ─────────────────────────────────────────────────────────

  /** Whether membership can still be edited at all — mirrors the backend guard, so Remove/Add
   *  Replacement aren't offered once training has started (or the batch is otherwise done). */
  get batchModifiable(): boolean {
    return !!this.selectedBatch && MODIFIABLE_BATCH_STATUSES.has(this.selectedBatch.status);
  }

  isReplaceable(member: JoiningBatchMember): boolean {
    return this.batchModifiable && REPLACEABLE_STATUSES.has(member.applicationStatus);
  }

  canResend(member: JoiningBatchMember): boolean {
    return this.batchModifiable && member.applicationStatus === 'JOINING_EXPIRED';
  }

  hasReplaceableMembers(): boolean {
    return (this.selectedBatch?.members ?? []).some((m) => this.isReplaceable(m));
  }

  removeMember(member: JoiningBatchMember): void {
    if (!this.selectedBatch) return;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Remove Candidate',
        message: `Remove ${member.candidateName} from this batch? They'll no longer count toward headcount, and you'll be able to add a replacement.`,
        type: 'warning',
        confirmText: 'Remove',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm || !this.selectedBatch) return;
      this.removingMemberId = member.applicationId;
      this.batchService.removeMember(this.selectedBatch.id, member.applicationId).subscribe({
        next: () => {
          this.removingMemberId = null;
          this.toastService.success(`${member.candidateName} removed from the batch.`);
          this.refreshDetail();
        },
        error: () => {
          this.removingMemberId = null;
        },
      });
    });
  }

  resendLetter(member: JoiningBatchMember): void {
    if (!this.selectedBatch) return;
    this.resendingMemberId = member.applicationId;
    this.batchService.resendLetter(this.selectedBatch.id, member.applicationId).subscribe({
      next: () => {
        this.resendingMemberId = null;
        this.toastService.success(`Joining letter resent to ${member.candidateName}.`);
        this.refreshDetail();
      },
      error: () => {
        this.resendingMemberId = null;
      },
    });
  }

  openAddReplacement(): void {
    if (!this.selectedBatch) return;
    this.showAddReplacement = true;
    this.selectedReplacements.clear();
    this.loadingReplacementEligible = true;
    this.batchService.getEligible(this.selectedBatch.joiningLocationId).subscribe({
      next: (list) => {
        this.replacementEligible = list;
        this.loadingReplacementEligible = false;
      },
      error: () => {
        this.loadingReplacementEligible = false;
      },
    });
  }

  cancelAddReplacement(): void {
    this.showAddReplacement = false;
    this.selectedReplacements.clear();
  }

  toggleReplacement(applicationId: number): void {
    if (this.selectedReplacements.has(applicationId)) {
      this.selectedReplacements.delete(applicationId);
    } else {
      this.selectedReplacements.add(applicationId);
    }
  }

  confirmAddReplacements(): void {
    if (!this.selectedBatch || this.selectedReplacements.size === 0) return;
    this.addingReplacements = true;
    this.batchService.addReplacementMembers(this.selectedBatch.id, Array.from(this.selectedReplacements)).subscribe({
      next: () => {
        this.addingReplacements = false;
        this.toastService.success(`${this.selectedReplacements.size} replacement candidate(s) added. Send the joining letter to notify them.`);
        this.showAddReplacement = false;
        this.selectedReplacements.clear();
        this.refreshDetail();
      },
      error: () => {
        this.addingReplacements = false;
      },
    });
  }

  // ─── Training Assignment ────────────────────────────────────────────────────

  assignTraining(): void {
    if (!this.selectedBatch || !this.selectedTrainingProgramId) return;
    const program = this.trainingPrograms.find((p) => p.id === this.selectedTrainingProgramId);
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Assign to Training',
        message: `Assign this batch to "${program?.name}"? This charges the training cost against ${this.selectedBatch.trainingLocationName}'s budget for every candidate who accepted their joining letter, and cannot be undone.`,
        type: 'warning',
        confirmText: 'Assign & Deduct',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm || !this.selectedBatch) return;
      this.assigning = true;
      this.trainingBatchService.assignTraining(this.selectedBatch.id, { trainingProgramId: this.selectedTrainingProgramId! }).subscribe({
        next: (d) => {
          this.assigning = false;
          this.selectedBatch = d.batch;
          this.trainees = d.trainees;
          this.assignedTrainingName = d.assignedTrainingName ?? null;
          this.toastService.success(`Training assigned — ${d.trainees.length} trainee(s) created.`);
          this.loadBatches();
        },
        error: () => {
          this.assigning = false;
        },
      });
    });
  }

  // ─── Trainee search + selection ──────────────────────────────────────────────

  get filteredTrainees(): TraineeDetail[] {
    const q = this.traineeSearch.trim().toLowerCase();
    if (!q) return this.trainees;
    return this.trainees.filter(
      (t) =>
        t.candidateName.toLowerCase().includes(q) ||
        t.candidateEmail.toLowerCase().includes(q) ||
        (t.employeeCode || '').toLowerCase().includes(q),
    );
  }

  toggleTrainee(traineeId: number): void {
    if (this.selectedTrainees.has(traineeId)) this.selectedTrainees.delete(traineeId);
    else this.selectedTrainees.add(traineeId);
  }

  isAllFilteredSelected(): boolean {
    const filtered = this.filteredTrainees;
    return filtered.length > 0 && filtered.every((t) => this.selectedTrainees.has(t.traineeId));
  }

  toggleAllFiltered(): void {
    if (this.isAllFilteredSelected()) {
      this.filteredTrainees.forEach((t) => this.selectedTrainees.delete(t.traineeId));
    } else {
      this.filteredTrainees.forEach((t) => this.selectedTrainees.add(t.traineeId));
    }
  }

  clearTraineeSelection(): void {
    this.selectedTrainees.clear();
  }

  onTraineeBulkAction(actionId: string): void {
    const ids = Array.from(this.selectedTrainees);
    if (ids.length === 0) return;
    if (actionId === 'lap') {
      this.lapBulkIds = ids;
      this.lapDialogTrainee = null;
      this.lapRemarks = '';
    } else if (actionId === 'flag') {
      this.flagBulkIds = ids;
      this.flagDialogTrainee = null;
      this.flagReason = '';
    } else if (actionId === 'release') {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Release Trainees',
          message: `Release ${ids.length} trainee(s)? They'll become eligible for project allocation.`,
          type: 'warning',
          confirmText: 'Release',
        },
      });
      dialogRef.afterClosed().subscribe((confirm) => {
        if (!confirm) return;
        this.bulkActing = true;
        this.trainingBatchService.bulkRelease(ids).subscribe({
          next: (r) => {
            this.bulkActing = false;
            this.toastService.success(`Released ${r.successCount}/${r.totalRequested} trainee(s).`);
            this.clearTraineeSelection();
            this.refreshDetail();
          },
          error: () => {
            this.bulkActing = false;
          },
        });
      });
    }
  }

  // ─── LAP (single + bulk share one modal) ─────────────────────────────────────

  openLapDialog(trainee: TraineeDetail): void {
    this.lapDialogTrainee = trainee;
    this.lapBulkIds = null;
    this.lapRemarks = '';
  }

  closeLapDialog(): void {
    this.lapDialogTrainee = null;
    this.lapBulkIds = null;
  }

  confirmMoveToLap(): void {
    if (this.lapBulkIds) {
      this.bulkActing = true;
      this.trainingBatchService.bulkMoveToLap(this.lapBulkIds, this.lapRemarks).subscribe({
        next: (r) => {
          this.bulkActing = false;
          this.toastService.success(`Moved ${r.successCount}/${r.totalRequested} trainee(s) to LAP.`);
          this.closeLapDialog();
          this.clearTraineeSelection();
          this.refreshDetail();
        },
        error: () => {
          this.bulkActing = false;
        },
      });
      return;
    }
    if (!this.lapDialogTrainee) return;
    this.trainingBatchService.moveToLap(this.lapDialogTrainee.traineeId, this.lapRemarks).subscribe({
      next: () => {
        this.toastService.success('Trainee moved to LAP.');
        this.closeLapDialog();
        this.refreshDetail();
      },
      error: () => {},
    });
  }

  removeFromLap(trainee: TraineeDetail): void {
    this.trainingBatchService.removeFromLap(trainee.traineeId).subscribe({
      next: () => {
        this.toastService.success('Trainee removed from LAP — back to In Progress. Re-upload their result or Release/Flag once decided.');
        this.refreshDetail();
      },
      error: () => {},
    });
  }

  // ─── Release (single) ────────────────────────────────────────────────────────

  releaseTrainee(trainee: TraineeDetail): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Release Candidate',
        message: `Release ${trainee.candidateName}? They'll become eligible for project allocation.`,
        type: 'warning',
        confirmText: 'Release',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm) return;
      this.trainingBatchService.releaseTrainee(trainee.traineeId).subscribe({
        next: () => {
          this.toastService.success(`${trainee.candidateName} released.`);
          this.refreshDetail();
        },
        error: () => {},
      });
    });
  }

  // ─── Flag (single + bulk share one modal) ────────────────────────────────────

  openFlagDialog(trainee: TraineeDetail): void {
    this.flagDialogTrainee = trainee;
    this.flagBulkIds = null;
    this.flagReason = '';
  }

  closeFlagDialog(): void {
    this.flagDialogTrainee = null;
    this.flagBulkIds = null;
  }

  confirmFlag(): void {
    const reason = this.flagReason.trim();
    if (!reason) return;
    if (this.flagBulkIds) {
      this.bulkActing = true;
      this.trainingBatchService.bulkFlag(this.flagBulkIds, reason).pipe(
        finalize(() => (this.bulkActing = false)),
      ).subscribe({
        next: (r) => {
          this.toastService.success(`Flagged ${r.successCount}/${r.totalRequested} trainee(s).`);
          this.closeFlagDialog();
          this.clearTraineeSelection();
          this.refreshDetail();
        },
        error: () => {},
      });
      return;
    }
    if (!this.flagDialogTrainee) return;
    this.bulkActing = true;
    this.trainingBatchService.flagTrainee(this.flagDialogTrainee.traineeId, reason).pipe(
      finalize(() => (this.bulkActing = false)),
    ).subscribe({
      next: () => {
        this.toastService.success('Trainee flagged as unsuccessful.');
        this.closeFlagDialog();
        this.refreshDetail();
      },
      error: () => {},
    });
  }

  // ─── Completion / Release ───────────────────────────────────────────────────

  completeBatch(): void {
    if (!this.selectedBatch) return;
    if (this.missingResultCount > 0) {
      this.dialog.open(ConfirmationDialogComponent, {
        data: {
          title: 'Upload Results Required',
          message: `Upload assessment results for all trainees before completing this batch. ${this.missingResultCount} trainee result(s) are still missing.`,
          type: 'info',
          confirmText: 'OK',
          hideCancel: true,
        },
      });
      return;
    }
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Complete Batch',
        message: 'This releases every "Yet To Release" trainee (Passed result) for project allocation and frees up the training block immediately. If any trainee is still on LAP or missing a result, the batch moves to "Release Pending (LAP)" until each of them is released or flagged. Continue?',
        type: 'warning',
        confirmText: 'Complete Batch',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm || !this.selectedBatch) return;
      this.completing = true;
      this.trainingBatchService.completeBatch(this.selectedBatch.id).pipe(
        finalize(() => (this.completing = false)),
      ).subscribe({
        next: (d) => {
          this.selectedBatch = d.batch;
          this.trainees = d.trainees;
          const releasedCount = d.trainees.filter((t) => t.released).length;
          const lapCount = d.trainees.filter((t) => !t.released && t.lapEnabled).length;
          this.toastService.success(`Batch completed — ${releasedCount}/${d.trainees.length} released, ${lapCount} still on LAP.`);
          this.loadBatches();
        },
        error: () => {},
      });
    });
  }

  /** Archives a fully-resolved (COMPLETED) batch. Only offered once every trainee has a final
   *  outcome — a batch still RELEASE_PENDING_LAP can't be closed (see backend closeBatch guard). */
  closeBatch(): void {
    if (!this.selectedBatch) return;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Close Batch',
        message: `Archive batch ${this.selectedBatch.batchCode}? This is a terminal action — the batch will no longer appear as active.`,
        type: 'info',
        confirmText: 'Close Batch',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm || !this.selectedBatch) return;
      this.closing = true;
      this.trainingBatchService.closeBatch(this.selectedBatch.id).subscribe({
        next: (d) => {
          this.closing = false;
          this.selectedBatch = d.batch;
          this.toastService.success(`Batch ${d.batch.batchCode} closed.`);
          this.loadBatches();
        },
        error: () => {
          this.closing = false;
        },
      });
    });
  }

  // ─── Trainee result Excel upload ─────────────────────────────────────────────

  downloadExcelTemplate(): void {
    this.trainingBatchService.downloadExcelTemplate().subscribe({
      next: (blob) => this.download(blob, 'trainee-results-template.xlsx'),
      error: () => {},
    });
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.excelFile = input.files?.[0] ?? null;
    this.excelPreview = null;
  }

  validateExcel(): void {
    if (!this.excelFile || !this.selectedBatch) return;
    this.validatingExcel = true;
    this.trainingBatchService.validateExcel(this.selectedBatch.id, this.excelFile).subscribe({
      next: (summary) => {
        this.validatingExcel = false;
        this.excelPreview = summary;
      },
      error: () => {
        this.validatingExcel = false;
      },
    });
  }

  commitExcel(): void {
    if (!this.excelFile || !this.selectedBatch) return;
    this.committingExcel = true;
    this.trainingBatchService.commitExcel(this.selectedBatch.id, this.excelFile).subscribe({
      next: (summary) => {
        this.committingExcel = false;
        this.excelPreview = summary;
        this.excelFile = null;
        this.toastService.success(
          `Upload complete: ${summary.successRows} succeeded, ${summary.failedRows} failed. Passed trainees are Yet To Release; failed trainees moved to LAP. Use "Complete Batch" below to release everyone Yet To Release.`,
        );
        this.refreshDetail();
        this.loadExcelHistory();
      },
      error: () => {
        this.committingExcel = false;
      },
    });
  }

  toggleExcelHistory(): void {
    this.showExcelHistory = !this.showExcelHistory;
    if (this.showExcelHistory) this.loadExcelHistory();
  }

  private loadExcelHistory(): void {
    if (!this.selectedBatch) return;
    this.trainingBatchService.excelHistory(this.selectedBatch.id).subscribe((h) => (this.excelHistory = h));
  }

  // ─── Export ─────────────────────────────────────────────────────────────────

  exportTrainees(): void {
    if (!this.selectedBatch) return;
    this.exporting = true;
    this.trainingBatchService.exportTrainees(this.selectedBatch.id).subscribe({
      next: (blob) => {
        this.exporting = false;
        this.download(blob, `trainees-${this.selectedBatch!.batchCode}.xlsx`);
      },
      error: () => {
        this.exporting = false;
      },
    });
  }

  private download(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ─── Activity / History ───────────────────────────────────────────────────────

  toggleActivity(): void {
    this.showActivity = !this.showActivity;
    if (this.showActivity && this.selectedBatch) {
      this.loadingActivity = true;
      this.batchService.getActivity(this.selectedBatch.id).subscribe({
        next: (log) => {
          this.activityLog = log;
          this.loadingActivity = false;
        },
        error: () => {
          this.loadingActivity = false;
        },
      });
    }
  }
}
