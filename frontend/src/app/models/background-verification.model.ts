// ─── Background Verification (BGC) Models ─────────────────────────────────────
// Aligned with backend com.nexhire.enums.BgvStatus / BgcDocumentStatus.

export type BgvStatus =
  | 'NOT_INITIATED'
  | 'INITIATED'
  | 'DOCUMENTS_PENDING'
  | 'DOCUMENTS_SUBMITTED'
  | 'VERIFICATION_IN_PROGRESS'
  | 'CLEARED'
  | 'FAILED'
  | 'RECHECK_REQUIRED'
  | 'ON_HOLD';

export type BgcDocumentStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'REUPLOAD_REQUIRED';

export interface BackgroundVerification {
  bgvId: number;
  applicationId?: number;
  userId?: number;
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  status: BgvStatus;
  remarks?: string;
  initiatedDate?: string;
  completedDate?: string;
  updatedAt?: string;
}

export interface UpdateBgvStatusRequest {
  status: BgvStatus;
  remarks?: string;
}

export interface BgcDocument {
  id: number;
  bgcCaseId: number;
  applicationId: number;
  documentType: string;
  fileName: string;
  status: BgcDocumentStatus;
  remarks?: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export interface BgcDocumentReviewRequest {
  status: BgcDocumentStatus;
  remarks?: string;
}

export interface BgcCaseDetail {
  bgcCaseId: number;
  applicationId: number;
  userId: number;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  jobTitle: string;
  status: BgvStatus;
  remarks?: string;
  initiatedAt?: string;
  completedAt?: string;
  offerAcceptedAt?: string;
  documents: BgcDocument[];
  auditHistory: {
    id: number;
    userId?: number;
    userName?: string;
    actionType: string;
    description: string;
    timestamp: string;
  }[];
}
