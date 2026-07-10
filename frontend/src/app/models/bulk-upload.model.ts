// ─── Bulk Excel Upload Models ─────────────────────────────────────────────────
// Aligned with backend com.nexhire.dto.UploadSummaryResponse / RowErrorResponse.
// Shared shape for every Excel bulk-upload workflow (assessment results, BGC
// results, trainee results): template download -> validate (preview) -> commit.

export interface RowError {
  rowNumber: number;
  identifier?: string;
  errorMessage: string;
}

export interface UploadSummary {
  uploadLogId?: number | null;
  uploadType: string;
  fileName: string;
  uploadedAt: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  status: string;
  errors: RowError[];
  previewRows: Record<string, string>[];
}
