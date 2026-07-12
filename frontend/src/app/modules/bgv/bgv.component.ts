import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { BackgroundVerificationService } from '../../services/background-verification.service';
import { BgcExcelService } from '../../services/bgc-excel.service';
import { ToastService } from '../../shared/services/toast.service';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {
  BackgroundVerification,
  BgcCaseDetail,
  BgcDocumentStatus,
  BgvStatus,
} from '../../models/background-verification.model';
import { UploadSummary } from '../../models/bulk-upload.model';

@Component({
  selector: 'app-bgv-mgmt',
  templateUrl: './bgv.component.html',
  styleUrls: ['./bgv.component.scss'],
  standalone: false,
})
export class BgvManagementComponent implements OnInit {
  cases: BackgroundVerification[] = [];
  totalRecords = 0;
  page = 0;
  size = 20;
  displayedColumns = ['candidate', 'jobTitle', 'status', 'actions'];
  loading = false;

  search = '';
  statusFilter = '';

  // Case detail panel
  selectedCase: BackgroundVerification | null = null;
  detail: BgcCaseDetail | null = null;
  loadingDetail = false;

  // Document review modal
  reviewDoc: { id: number; documentType: string } | null = null;
  reviewStatus: BgcDocumentStatus = 'ACCEPTED';
  reviewRemarks = '';

  // Excel bulk upload panel
  excelFile: File | null = null;
  validating = false;
  committing = false;
  preview: UploadSummary | null = null;
  history: UploadSummary[] = [];
  showHistory = false;

  constructor(
    private bgvService: BackgroundVerificationService,
    private excelService: BgcExcelService,
    private toastService: ToastService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.loadCases();
  }

  loadCases(): void {
    this.loading = true;
    this.bgvService
      .search({ search: this.search, status: this.statusFilter, page: this.page, size: this.size })
      .subscribe({
        next: (result) => {
          this.cases = result.content;
          this.totalRecords = result.totalElements;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  applyFilters(): void {
    this.page = 0;
    this.loadCases();
  }

  onPageChange(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.loadCases();
  }

  openCase(c: BackgroundVerification): void {
    this.selectedCase = c;
    this.loadingDetail = true;
    this.bgvService.getDetail(c.bgvId).subscribe({
      next: (d) => {
        this.detail = d;
        this.loadingDetail = false;
      },
      error: () => {
        this.loadingDetail = false;
      },
    });
  }

  closeDetail(): void {
    this.selectedCase = null;
    this.detail = null;
  }

  quickTransition(c: BackgroundVerification, status: BgvStatus): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm BGC Status Change',
        message:
          status === 'CLEARED'
            ? 'Clearing this case immediately creates the employee record and selected-user entry. Continue?'
            : status === 'FAILED'
              ? 'Mark this candidate as failed background verification?'
              : 'Move this case to Verification In Progress?',
        type: status === 'CLEARED' || status === 'VERIFICATION_IN_PROGRESS' ? 'info' : 'danger',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm) return;
      this.bgvService.updateStatus(c.bgvId, { status }).subscribe({
        next: () => {
          this.toastService.success(`BGC case updated: ${status}`);
          this.loadCases();
          if (this.selectedCase?.bgvId === c.bgvId) this.openCase(c);
        },
        error: () => {},
      });
    });
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  openReview(doc: { id: number; documentType: string }): void {
    this.reviewDoc = doc;
    this.reviewStatus = 'ACCEPTED';
    this.reviewRemarks = '';
  }

  submitReview(): void {
    if (!this.reviewDoc) return;
    this.bgvService.reviewDocument(this.reviewDoc.id, { status: this.reviewStatus, remarks: this.reviewRemarks }).subscribe({
      next: () => {
        this.toastService.success('Document review saved.');
        this.reviewDoc = null;
        if (this.selectedCase) this.openCase(this.selectedCase);
        this.loadCases();
      },
      error: () => {},
    });
  }

  downloadDocument(documentId: number): void {
    this.bgvService.downloadDocument(documentId).subscribe({
      next: (blob) => window.open(window.URL.createObjectURL(blob), '_blank'),
      error: () => {},
    });
  }

  // ─── Excel bulk upload ────────────────────────────────────────────────────

  downloadTemplate(): void {
    this.excelService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bgc-results-template.xlsx';
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
    this.excelService.validate(this.excelFile).subscribe({
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
        title: 'Commit BGC Results',
        message: `This will update ${this.preview?.successRows ?? 0} case(s) and auto-create Employee/SelectedUser records for any that clear. Continue?`,
        type: 'warning',
        confirmText: 'Commit',
      },
    });
    dialogRef.afterClosed().subscribe((confirm) => {
      if (!confirm) return;
      this.committing = true;
      this.excelService.commit(this.excelFile!).subscribe({
        next: (summary) => {
          this.committing = false;
          this.preview = summary;
          this.excelFile = null;
          this.toastService.success(`Upload complete: ${summary.successRows} succeeded, ${summary.failedRows} failed.`);
          this.loadCases();
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
    if (this.showHistory && this.history.length === 0) this.loadHistory();
  }

  private loadHistory(): void {
    this.excelService.history().subscribe((h) => (this.history = h));
  }
}
