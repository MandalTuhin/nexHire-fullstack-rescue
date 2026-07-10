// ─── Offer Letter Models ──────────────────────────────────────────────────────
// Aligned with backend com.nexhire.dto.OfferResponse. The offer PDF is auto-generated
// once an application reaches ASSESSMENT_PASSED — there is no manual "create offer" step.

export type OfferStatus = 'GENERATED' | 'SENT' | 'ACCEPTED' | 'REJECTED';

export interface OfferLetter {
  offerId: number;
  applicationId: number;
  userId?: number;
  candidateName?: string;
  candidateEmail?: string;
  jobTitle?: string;
  assessmentScore?: number;
  content?: string;
  pdfFileId?: number;
  status: OfferStatus;
  generatedAt?: string;
  sentByName?: string;
  sentAt?: string;
  respondedAt?: string;
}
