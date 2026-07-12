import { AfterViewInit, Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ApplicationService } from '../../services/application.service';
import { AssessmentExcelService } from '../../services/assessment-excel.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TableColumn, SortEvent } from '../../shared/components/data-table/data-table.component';
import { Application, ApplicationFilterRequest, ApplicationStatus } from '../../models/application.model';
import { UploadSummary } from '../../models/bulk-upload.model';

/** DataTableComponent requires rows to carry an `id`; Application uses `applicationId`. */
interface AssessmentRow extends Application {
  id: number;
  assessmentStatusLabel: 'Result in Progress' | 'Passed' | 'Failed';
}

/** Statuses that mean "no assessment decision yet" — everything else (ASSESSMENT_PASSED
 *  and every status downstream of it, since offer generation/BGC/joining all imply a pass)
 *  reads as Passed, and ASSESSMENT_FAILED reads as Failed. Assessment result is a historical
 *  fact — it shouldn't disappear once a candidate moves on to later pipeline stages. */
const PENDING_STATUSES = new Set<ApplicationStatus>([
  'APPLIED',
  'ASSESSMENT_ASSIGNED',
  'ASSESSMENT_SCORE_UPLOADED',
]);

/**
 * Assessments page — per the redesign, HR never manually assigns/scores/passes/fails a
 * candidate. Eligibility (10th/12th/graduation >=60%) is enforced at apply-time, so every
 * APPLIED candidate is already assessment-eligible; the Excel upload is the only way results
 * ever get recorded, and it decides pass/fail (and auto-generates the offer) itself. This page
 * is purely: upload results, see status.
 */
@Component({
  selector: 'app-assessments-mgmt',
  templateUrl: './assessments.component.html',
  styleUrls: ['./assessments.component.scss'],
  standalone: false,
})
export class AssessmentsManagementComponent implements OnInit, AfterViewInit {
  @ViewChild('candidateCell') candidateCellTpl!: TemplateRef<any>;
  @ViewChild('statusCell') statusCellTpl!: TemplateRef<any>;

  columns: TableColumn[] = [];
  rows: AssessmentRow[] = [];
  totalRecords = 0;
  loading = false;

  page = 0;
  size = 25;
  sortBy = 'appliedAt';
  sortDir: 'asc' | 'desc' = 'desc';
  search = '';

  // Excel bulk upload panel
  excelFile: File | null = null;
  cutoff: number | null = null;
  validating = false;
  committing = false;
  preview: UploadSummary | null = null;
  history: UploadSummary[] = [];
  showHistory = false;

  constructor(
    private appService: ApplicationService,
    private excelService: AssessmentExcelService,
    private toastService: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngAfterViewInit(): void {
    this.columns = [
      { field: 'candidate', label: 'Candidate', sortable: true, cellTemplate: this.candidateCellTpl },
      { field: 'passoutYear', label: 'Passout Year', sortable: false },
      { field: 'assessmentStatusLabel', label: 'Status', sortable: false, cellTemplate: this.statusCellTpl },
    ];
  }

  load(): void {
    this.loading = true;
    const filter: ApplicationFilterRequest = {
      search: this.search || undefined,
      sortBy: this.sortBy,
      sortDir: this.sortDir,
      page: this.page,
      size: this.size,
    };
    this.appService.search(filter).subscribe({
      next: (page) => {
        this.rows = page.content.map((a) => ({
          ...a,
          id: a.applicationId,
          assessmentStatusLabel: this.statusLabel(a.status),
        }));
        this.totalRecords = page.totalElements;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private statusLabel(status: ApplicationStatus): 'Result in Progress' | 'Passed' | 'Failed' {
    if (status === 'ASSESSMENT_FAILED') return 'Failed';
    if (PENDING_STATUSES.has(status)) return 'Result in Progress';
    return 'Passed';
  }

  onSearchChange(): void {
    this.page = 0;
    this.load();
  }

  onSort(event: SortEvent): void {
    if (!event.direction) {
      this.sortBy = 'appliedAt';
      this.sortDir = 'desc';
    } else {
      this.sortBy = event.column === 'candidate' ? 'candidateName' : event.column;
      this.sortDir = event.direction;
    }
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.load();
  }

  // ─── Excel bulk upload ────────────────────────────────────────────────────

  downloadTemplate(): void {
    this.excelService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'assessment-results-template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {},
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.excelFile = input.files?.[0] ?? null;
    this.preview = null;
  }

  validateFile(): void {
    if (!this.excelFile) return;
    this.validating = true;
    this.excelService.validate(this.excelFile, this.cutoff).subscribe({
      next: (summary) => {
        this.validating = false;
        this.preview = summary;
      },
      error: () => {
        this.validating = false;
      },
    });
  }

  commitFile(): void {
    if (!this.excelFile) return;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Commit Assessment Results',
        message: `This will save results for ${this.preview?.successRows ?? 0} valid row(s) and update statuses — candidates who pass are automatically moved to the offer letter stage. Continue?`,
        type: 'warning',
        confirmText: 'Commit',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm) return;
      this.committing = true;
      this.excelService.commit(this.excelFile!, this.cutoff).subscribe({
        next: (summary) => {
          this.committing = false;
          this.preview = summary;
          this.excelFile = null;
          this.toastService.success(
            `Upload complete: ${summary.successRows} succeeded, ${summary.failedRows} failed.`,
          );
          this.load();
          this.loadHistory();
        },
        error: () => {
          this.committing = false;
        },
      });
    });
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
    if (this.showHistory && this.history.length === 0) {
      this.loadHistory();
    }
  }

  private loadHistory(): void {
    this.excelService.history().subscribe((h) => (this.history = h));
  }
}
