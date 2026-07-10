// ─── Joining Letter Models (backend aligned) ─────────────────────────────────

export interface JoiningLetter {
  id: number;
  applicationId: number;
  batchId?: number;
  batchCode?: string;
  employeeCode?: string;
  jobTitle: string;
  content: string;
  pdfFileId?: number;
  joiningDate: string;
  locationName: string;
  status: string;
  holdReason?: string;
  generatedAt?: string;
  sentByName?: string;
  sentAt?: string;
  respondedAt?: string;
}
