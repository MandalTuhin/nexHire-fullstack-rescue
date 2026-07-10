import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
  filteredCases: BackgroundVerification[] = [];
  displayedColumns = ['candidate', 'jobTitle', 'status', 'vendor', 'actions'];
  loading = false;

  search = '';
  statusFilter = '';

  // Case detail panel
  selectedCase: BackgroundVerification | null = null;
  detail: BgcCaseDetail | null = null;
  loadingDetail = false;

  // Vendor request form (shown inline in the detail panel)
  showVendorForm = false;
  vendorName = '';
  vendorLink = '';
  vendorReference = '';
  vendorRemarks = '';

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
    this.bgvService.getAll().subscribe({
      next: (list) => {
        this.cases = list;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toastService.error('Failed to load BGC cases.');
      },
    });
  }

  applyFilters(): void {
    const s = this.search.trim().toLowerCase();
    this.filteredCases = this.cases.filter((c) => {
      const matchesSearch =
        !s ||
        (c.candidateName || '').toLowerCase().includes(s) ||
        (c.candidateEmail || '').toLowerCase().includes(s);
      const matchesStatus = !this.statusFilter || c.status === this.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  openCase(c: BackgroundVerification): void {
    this.selectedCase = c;
    this.showVendorForm = false;
    this.loadingDetail = true;
    this.bgvService.getDetail(c.bgvId).subscribe({
      next: (d) => {
        this.detail = d;
        this.loadingDetail = false;
      },
      error: () => {
        this.loadingDetail = false;
        this.toastService.error('Failed to load case detail.');
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
        title: 'Confirm BGC Result',
        message:
          status === 'CLEARED'
            ? 'Clearing this case immediately creates the employee record and selected-user entry. Continue?'
            : 'Mark this candidate as failed background verification?',
        type: status === 'CLEARED' ? 'info' : 'danger',
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
        error: (e) => this.toastService.error(e.error?.message || 'Update failed.'),
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
      error: (e) => this.toastService.error(e.error?.message || 'Review failed.'),
    });
  }

  downloadDocument(documentId: number): void {
    this.bgvService.downloadDocument(documentId).subscribe({
      next: (blob) => window.open(window.URL.createObjectURL(blob), '_blank'),
      error: () => this.toastService.error('Unable to load document.'),
    });
  }

  // ─── Vendor requests ────────────────────────────────────────────────────────

  submitVendorRequest(): void {
    if (!this.selectedCase) return;
    this.bgvService
      .sendToVendor(this.selectedCase.bgvId, {
        vendorName: this.vendorName,
        vendorLink: this.vendorLink,
        requestReference: this.vendorReference,
        remarks: this.vendorRemarks,
      })
      .subscribe({
        next: () => {
          this.toastService.success('Sent to vendor — case moved to Verification In Progress.');
          this.showVendorForm = false;
          this.vendorName = '';
          this.vendorLink = '';
          this.vendorReference = '';
          this.vendorRemarks = '';
          if (this.selectedCase) this.openCase(this.selectedCase);
          this.loadCases();
        },
        error: (e) => this.toastService.error(e.error?.message || 'Failed to send to vendor.'),
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
      error: () => this.toastService.error('Failed to download template.'),
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
      error: (e) => {
        this.validating = false;
        this.toastService.error(e.error?.message || 'Validation failed.');
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
        error: (e) => {
          this.committing = false;
          this.toastService.error(e.error?.message || 'Commit failed.');
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
