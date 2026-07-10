import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { JoiningBatchService } from '../../services/joining-batch.service';
import { TrainingBatchService } from '../../services/training-batch.service';
import { LocationBudgetService } from '../../services/location-budget.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { LocationBudget } from '../../models/location-budget.model';
import { EligibleJoiningCandidate, JoiningBatch } from '../../models/joining-batch.model';
import { TraineeDetail, TrainingBatchDetail, TrainingProgram } from '../../models/training-batch.model';
import { UploadSummary } from '../../models/bulk-upload.model';

type ViewMode = 'list' | 'wizard' | 'detail';

@Component({
  selector: 'app-joining-batches',
  templateUrl: './joining-batches.component.html',
  styleUrls: ['./joining-batches.component.scss'],
  standalone: false,
})
export class JoiningBatchesComponent implements OnInit {
  view: ViewMode = 'list';

  batches: JoiningBatch[] = [];
  loading = false;

  locations: LocationBudget[] = [];

  // Wizard state
  wizardStep = 0;
  detailsForm!: FormGroup;
  trainingForm!: FormGroup;
  sizeForm!: FormGroup;
  eligible: EligibleJoiningCandidate[] = [];
  loadingEligible = false;
  selected = new Set<number>();
  creating = false;

  // Detail view state
  selectedBatch: JoiningBatch | null = null;
  loadingDetail = false;
  generating = false;
  sending = false;

  // Phase 6: training assignment / LAP / release / trainee results
  trainingPrograms: TrainingProgram[] = [];
  selectedTrainingProgramId: number | null = null;
  assigning = false;
  trainees: TraineeDetail[] = [];
  assignedTrainingName: string | null = null;
  completing = false;

  lapDialogTrainee: TraineeDetail | null = null;
  lapRemarks = '';

  excelFile: File | null = null;
  validatingExcel = false;
  committingExcel = false;
  excelPreview: UploadSummary | null = null;
  excelHistory: UploadSummary[] = [];
  showExcelHistory = false;

  constructor(
    private fb: FormBuilder,
    private batchService: JoiningBatchService,
    private trainingBatchService: TrainingBatchService,
    private locationService: LocationBudgetService,
    private toastService: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.buildForms();
    this.loadBatches();
    this.locationService.getAll().subscribe((locs) => (this.locations = locs));
    this.trainingBatchService.getPrograms().subscribe((p) => (this.trainingPrograms = p));
  }

  private buildForms(): void {
    this.detailsForm = this.fb.group({
      batchName: [''],
      joiningDate: [null, Validators.required],
      joiningLocationId: [null, Validators.required],
    });
    this.trainingForm = this.fb.group({
      trainingLocationId: [null, Validators.required],
      trainingProgram: ['', Validators.required],
      block: [''],
      trainingStartDate: [null],
      trainingEndDate: [null],
    });
    this.sizeForm = this.fb.group({
      batchSize: [60, [Validators.required, Validators.min(1)]],
    });
  }

  loadBatches(): void {
    this.loading = true;
    this.batchService.getAll().subscribe({
      next: (list) => {
        this.batches = list.sort((a, b) => b.id - a.id);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Failed to load joining batches.');
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
        // Pre-select up to batchSize, already sorted by preference priority.
        const size = this.sizeForm.value.batchSize;
        this.selected = new Set(list.slice(0, size).map((c) => c.applicationId));
      },
      error: () => {
        this.loadingEligible = false;
        this.toastService.error('Failed to load eligible candidates.');
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
      this.batchService
        .create({
          batchName: d.batchName || undefined,
          joiningDate: this.toIso(d.joiningDate)!,
          joiningLocationId: d.joiningLocationId,
          trainingLocationId: t.trainingLocationId,
          trainingProgram: t.trainingProgram,
          block: t.block || undefined,
          trainingStartDate: this.toIso(t.trainingStartDate),
          trainingEndDate: this.toIso(t.trainingEndDate),
          batchSize: s.batchSize,
          applicationIds: Array.from(this.selected),
        })
        .subscribe({
          next: (batch) => {
            this.creating = false;
            this.toastService.success(`Batch ${batch.batchCode} created with ${batch.currentHeadcount} candidate(s).`);
            this.loadBatches();
            this.openDetail(batch.id);
          },
          error: (e) => {
            this.creating = false;
            this.toastService.error(e.error?.message || 'Failed to create batch.');
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
    this.loadingDetail = true;
    this.selectedTrainingProgramId = null;
    this.excelPreview = null;
    this.excelFile = null;
    this.showExcelHistory = false;
    this.trainingBatchService.getDetail(id).subscribe({
      next: (d: TrainingBatchDetail) => {
        this.selectedBatch = d.batch;
        this.trainees = d.trainees;
        this.assignedTrainingName = d.assignedTrainingName ?? null;
        this.loadingDetail = false;
      },
      error: () => {
        this.loadingDetail = false;
        this.toastService.error('Failed to load batch detail.');
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

  generateLetters(): void {
    if (!this.selectedBatch) return;
    this.generating = true;
    this.batchService.generateLetters(this.selectedBatch.id).subscribe({
      next: (b) => {
        this.generating = false;
        this.selectedBatch = b;
        this.toastService.success('Joining letters generated for all members.');
      },
      error: (e) => {
        this.generating = false;
        this.toastService.error(e.error?.message || 'Failed to generate letters.');
      },
    });
  }

  sendLetters(): void {
    if (!this.selectedBatch) return;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Send Joining Letters',
        message: `Send joining letters to all ${this.selectedBatch.currentHeadcount} candidate(s) in this batch?`,
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
          this.toastService.success('Joining letters sent.');
          this.loadBatches();
        },
        error: (e) => {
          this.sending = false;
          this.toastService.error(e.error?.message || 'Failed to send letters.');
        },
      });
    });
  }

  // ─── Phase 6: Training Assignment ────────────────────────────────────────────

  assignTraining(): void {
    if (!this.selectedBatch || !this.selectedTrainingProgramId) return;
    const program = this.trainingPrograms.find((p) => p.id === this.selectedTrainingProgramId);
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Assign to Training',
        message: `Assign this batch to "${program?.name}"? This deducts budget/seats at ${this.selectedBatch.trainingLocationName} for every candidate who accepted their joining letter, and cannot be undone.`,
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
        error: (e) => {
          this.assigning = false;
          this.toastService.error(e.error?.message || 'Failed to assign training.');
        },
      });
    });
  }

  // ─── LAP ────────────────────────────────────────────────────────────────────

  openLapDialog(trainee: TraineeDetail): void {
    this.lapDialogTrainee = trainee;
    this.lapRemarks = '';
  }

  confirmMoveToLap(): void {
    if (!this.lapDialogTrainee) return;
    this.trainingBatchService.moveToLap(this.lapDialogTrainee.traineeId, this.lapRemarks).subscribe({
      next: () => {
        this.toastService.success('Trainee moved to LAP.');
        this.lapDialogTrainee = null;
        this.refreshDetail();
      },
      error: (e) => this.toastService.error(e.error?.message || 'Failed to move to LAP.'),
    });
  }

  removeFromLap(trainee: TraineeDetail): void {
    this.trainingBatchService.removeFromLap(trainee.traineeId).subscribe({
      next: () => {
        this.toastService.success('Trainee removed from LAP.');
        this.refreshDetail();
      },
      error: (e) => this.toastService.error(e.error?.message || 'Failed to remove from LAP.'),
    });
  }

  // ─── Completion / Release ───────────────────────────────────────────────────

  completeBatch(): void {
    if (!this.selectedBatch) return;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Complete Batch',
        message: 'This releases every eligible trainee (score/attendance meeting the program cutoff, not on LAP) for project allocation. LAP/failed trainees are skipped, not blocked. Continue?',
        type: 'warning',
        confirmText: 'Complete & Release',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm || !this.selectedBatch) return;
      this.completing = true;
      this.trainingBatchService.completeBatch(this.selectedBatch.id).subscribe({
        next: (d) => {
          this.completing = false;
          this.selectedBatch = d.batch;
          this.trainees = d.trainees;
          const releasedCount = d.trainees.filter((t) => t.released).length;
          this.toastService.success(`Batch completed — ${releasedCount}/${d.trainees.length} trainee(s) released.`);
          this.loadBatches();
        },
        error: (e) => {
          this.completing = false;
          this.toastService.error(e.error?.message || 'Failed to complete batch.');
        },
      });
    });
  }

  // ─── Trainee result Excel upload ─────────────────────────────────────────────

  downloadExcelTemplate(): void {
    this.trainingBatchService.downloadExcelTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trainee-results-template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => this.toastService.error('Failed to download template.'),
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
      error: (e) => {
        this.validatingExcel = false;
        this.toastService.error(e.error?.message || 'Validation failed.');
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
        this.toastService.success(`Upload complete: ${summary.successRows} succeeded, ${summary.failedRows} failed.`);
        this.refreshDetail();
        this.loadExcelHistory();
      },
      error: (e) => {
        this.committingExcel = false;
        this.toastService.error(e.error?.message || 'Commit failed.');
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
}
