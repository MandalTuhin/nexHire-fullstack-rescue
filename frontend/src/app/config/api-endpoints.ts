import { environment } from '../../environments/environment';

const BASE = environment.apiBaseUrl;

/**
 * Centralized API endpoint configuration.
 * Aligned with the nexHIRE Spring Boot backend contract.
 * To adapt to backend changes, only update this file.
 */
export const API_ENDPOINTS = {
  // ─── Auth ──────────────────────────────────────────────────────────────────
  AUTH: {
    REGISTER: `${BASE}/api/auth/register`,
    LOGIN: `${BASE}/api/auth/login`,
    LOGOUT: `${BASE}/api/auth/logout`,
    ME: `${BASE}/api/auth/me`,
    CHANGE_PASSWORD: `${BASE}/api/auth/change-password`,
  },

  // ─── Users (Admin) ─────────────────────────────────────────────────────────
  USERS: {
    BASE: `${BASE}/api/users`,
    BY_ID: (id: number) => `${BASE}/api/users/${id}`,
    UPDATE_ROLE: (id: number) => `${BASE}/api/users/${id}/role`,
    DEACTIVATE: (id: number) => `${BASE}/api/users/${id}/deactivate`,
  },

  // ─── Roles ─────────────────────────────────────────────────────────────────
  ROLES: {
    BASE: `${BASE}/api/roles`,
  },

  // ─── Jobs ──────────────────────────────────────────────────────────────────
  JOBS: {
    BASE: `${BASE}/api/jobs`,
    BY_ID: (id: number) => `${BASE}/api/jobs/${id}`,
    CREATE: `${BASE}/api/jobs`,
  },

  // ─── Applications ──────────────────────────────────────────────────────────
  APPLICATIONS: {
    BASE: `${BASE}/api/applications`,
    APPLY: `${BASE}/api/applications`,
    MY: `${BASE}/api/applications/my`,
    BY_ID: (id: number) => `${BASE}/api/applications/${id}`,
    START_ASSESSMENT: (id: number) =>
      `${BASE}/api/applications/${id}/start-assessment`,
    // HR: high-volume search/filter/sort/pagination + bulk pipeline actions
    SEARCH: `${BASE}/api/applications/search`,
    BULK_ASSIGN_ASSESSMENT: `${BASE}/api/applications/bulk/assign-assessment`,
    BULK_REJECT: `${BASE}/api/applications/bulk/reject`,
    BULK_SHORTLIST: `${BASE}/api/applications/bulk/shortlist`,
    EXPORT: `${BASE}/api/applications/export`,
  },

  // ─── Candidate Profile (personal/academic/skills/resume/location prefs) ─────
  CANDIDATE_PROFILE: {
    ME: `${BASE}/api/candidate/profile`,
    RESUME: `${BASE}/api/candidate/profile/resume`,
    BY_USER: (userId: number) => `${BASE}/api/candidate/profile/${userId}`,
    RESUME_BY_USER: (userId: number) =>
      `${BASE}/api/candidate/profile/${userId}/resume`,
  },

  // ─── Assessments ───────────────────────────────────────────────────────────
  ASSESSMENTS: {
    ENTER_SCORE: (applicationId: number) =>
      `${BASE}/api/assessments/${applicationId}`,
    QUALIFY: (applicationId: number) =>
      `${BASE}/api/assessments/${applicationId}/qualify`,
    REJECT: (applicationId: number) =>
      `${BASE}/api/assessments/${applicationId}/reject`,
    EXCEL_TEMPLATE: `${BASE}/api/assessments/excel/template`,
    EXCEL_VALIDATE: `${BASE}/api/assessments/excel/validate`,
    EXCEL_COMMIT: `${BASE}/api/assessments/excel/commit`,
    EXCEL_HISTORY: `${BASE}/api/assessments/excel/history`,
  },

  // ─── Offer Letters ─────────────────────────────────────────────────────────
  OFFERS: {
    BASE: `${BASE}/api/offers`,
    SEND: (applicationId: number) => `${BASE}/api/offers/${applicationId}`,
    BULK_SEND: `${BASE}/api/offers/bulk/send`,
    GENERATED_IDS: `${BASE}/api/offers/generated-ids`,
    MY: `${BASE}/api/offers/my`,
    PDF: (offerId: number) => `${BASE}/api/offers/${offerId}/pdf`,
    ACCEPT: (id: number) => `${BASE}/api/offers/${id}/accept`,
    REJECT: (id: number) => `${BASE}/api/offers/${id}/reject`,
  },

  // ─── Joining Letters ───────────────────────────────────────────────────────
  JOINING_LETTERS: {
    MY: `${BASE}/api/joining-letters/my`,
    PDF: (id: number) => `${BASE}/api/joining-letters/${id}/pdf`,
    ACCEPT: (id: number) => `${BASE}/api/joining-letters/${id}/accept`,
    REJECT: (id: number) => `${BASE}/api/joining-letters/${id}/reject`,
  },
  JOINING_BATCHES: {
    BASE: `${BASE}/api/joining-batches`,
    ELIGIBLE: (joiningLocationId: number) =>
      `${BASE}/api/joining-batches/eligible?joiningLocationId=${joiningLocationId}`,
    BY_ID: (id: number) => `${BASE}/api/joining-batches/${id}`,
    AUTO_CREATE: `${BASE}/api/joining-batches/auto-create`,
    GENERATE_LETTERS: (id: number) => `${BASE}/api/joining-batches/${id}/generate-letters`,
    SEND_LETTERS: (id: number) => `${BASE}/api/joining-batches/${id}/send-letters`,
  },
  TRAINING_BATCHES: {
    BASE: `${BASE}/api/training-batches`,
    PROGRAMS: `${BASE}/api/training-batches/programs`,
    BY_ID: (id: number) => `${BASE}/api/training-batches/${id}`,
    ASSIGN_TRAINING: (id: number) => `${BASE}/api/training-batches/${id}/assign-training`,
    COMPLETE: (id: number) => `${BASE}/api/training-batches/${id}/complete`,
    MOVE_TO_LAP: (traineeId: number) => `${BASE}/api/training-batches/trainees/${traineeId}/lap`,
    REMOVE_FROM_LAP: (traineeId: number) => `${BASE}/api/training-batches/trainees/${traineeId}/remove-lap`,
    EXCEL_TEMPLATE: `${BASE}/api/training-batches/excel/template`,
    EXCEL_VALIDATE: (id: number) => `${BASE}/api/training-batches/${id}/excel/validate`,
    EXCEL_COMMIT: (id: number) => `${BASE}/api/training-batches/${id}/excel/commit`,
    EXCEL_HISTORY: (id: number) => `${BASE}/api/training-batches/${id}/excel/history`,
  },

  // ─── Locations (id/name lookups for dropdowns — budget passbook lives under CITIES) ─────
  LOCATIONS: {
    NAMES: `${BASE}/api/locations/names`,
  },

  // ─── Background Verification (Phase B) ───────────────────────────────────────
  BGV: {
    BASE: `${BASE}/api/bgv`,
    BY_ID: (id: number) => `${BASE}/api/bgv/${id}`,
    BY_APPLICATION: (applicationId: number) =>
      `${BASE}/api/bgv/application/${applicationId}`,
    INITIATE: (applicationId: number) => `${BASE}/api/bgv/${applicationId}`,
    UPDATE_STATUS: (id: number) => `${BASE}/api/bgv/${id}/status`,
    DETAIL: (id: number) => `${BASE}/api/bgv/${id}/detail`,
    UPLOAD_DOCUMENT: (applicationId: number) =>
      `${BASE}/api/bgv/${applicationId}/documents`,
    MY_DOCUMENTS: (applicationId: number) =>
      `${BASE}/api/bgv/${applicationId}/documents/my`,
    CASE_DOCUMENTS: (bgcCaseId: number) => `${BASE}/api/bgv/${bgcCaseId}/documents`,
    REVIEW_DOCUMENT: (documentId: number) =>
      `${BASE}/api/bgv/documents/${documentId}/review`,
    DOWNLOAD_DOCUMENT: (documentId: number) =>
      `${BASE}/api/bgv/documents/${documentId}/download`,
    SEND_TO_VENDOR: (bgcCaseId: number) => `${BASE}/api/bgv/${bgcCaseId}/vendor-request`,
    VENDOR_REQUESTS: (bgcCaseId: number) => `${BASE}/api/bgv/${bgcCaseId}/vendor-requests`,
    EXCEL_TEMPLATE: `${BASE}/api/bgv/excel/template`,
    EXCEL_VALIDATE: `${BASE}/api/bgv/excel/validate`,
    EXCEL_COMMIT: `${BASE}/api/bgv/excel/commit`,
    EXCEL_HISTORY: `${BASE}/api/bgv/excel/history`,
  },

  // ─── Trainees / Training (Phase B) ───────────────────────────────────────────
  TRAINEES: {
    // Legacy /api/training/** (trainees list/progress/complete) was removed — it duplicated
    // and conflicted with the real JoiningBatch+Trainee pipeline (TrainingBatchService). MY
    // now points at that real pipeline's own candidate self-service endpoint.
    BASE: `${BASE}/api/training/trainees`,
    MY: `${BASE}/api/training-batches/my`,
    BY_ID: (id: number) => `${BASE}/api/trainees/${id}`,
    UPDATE_STATUS: (id: number) => `${BASE}/api/trainees/${id}/status`,
    BY_TRAINING: (trainingId: number) =>
      `${BASE}/api/trainees/training/${trainingId}`,
  },

  // ─── Projects / Allocation (Phase B) ─────────────────────────────────────────
  PROJECTS: {
    BASE: `${BASE}/api/projects`,
    CREATE: `${BASE}/api/projects`,
    ELIGIBLE_TRAINEES: `${BASE}/api/projects/eligible-trainees`,
    ASSIGN: (projectId: number, traineeId: number) =>
      `${BASE}/api/projects/${projectId}/assign/${traineeId}`,
    BULK_ASSIGN: (projectId: number) => `${BASE}/api/projects/${projectId}/bulk-assign`,
    MY: `${BASE}/api/projects/my`,
    BY_ID: (id: number) => `${BASE}/api/projects/${id}`,
    UPDATE: (id: number) => `${BASE}/api/projects/${id}`,
    UPDATE_STATUS: (id: number) => `${BASE}/api/projects/${id}/status`,
    ACTIVE: `${BASE}/api/projects/active`,
  },

  // ─── Assets (Phase B) ────────────────────────────────────────────────────────
  ASSETS: {
    BASE: `${BASE}/api/assets`,
    CREATE: `${BASE}/api/assets`,
    ASSIGN: (assetId: number, userId: number) =>
      `${BASE}/api/assets/${assetId}/assign/${userId}`,
    REVOKE: (assignmentId: number) =>
      `${BASE}/api/assets/assignments/${assignmentId}/revoke`,
    BY_USER: (userId: number) => `${BASE}/api/assets/user/${userId}`,
    BY_ID: (id: number) => `${BASE}/api/assets/${id}`,
    UPDATE: (id: number) => `${BASE}/api/assets/${id}`,
    UPDATE_STATUS: (id: number) => `${BASE}/api/assets/${id}/status`,
    AVAILABLE: `${BASE}/api/assets/available`,
  },

  // ─── Activity Logs (Phase C) ─────────────────────────────────────────────────
  ACTIVITY_LOGS: {
    BASE: `${BASE}/api/activity-logs`,
  },

  // ─── Legacy groups (mock-only modules not yet on the real backend) ───────────
  // These remain so mock-backed services keep compiling. They are only hit while
  // environment.useMockData is true and the module has not been migrated.
  EMPLOYEES: {
    BASE: `${BASE}/api/employees`,
    BY_ID: (id: number) => `${BASE}/api/employees/${id}`,
    UPDATE_ROLE: (id: number) => `${BASE}/api/employees/${id}/role`,
    UPDATE_STATUS: (id: number) => `${BASE}/api/employees/${id}/status`,
    SEARCH: `${BASE}/api/employees/search`,
  },
  SELECTED: {
    BASE: `${BASE}/api/selected`,
    BY_ID: (id: number) => `${BASE}/api/selected/${id}`,
    BY_EMPLOYEE: (empId: number) => `${BASE}/api/selected/employee/${empId}`,
    UPDATE_STATUS: (id: number) => `${BASE}/api/selected/${id}/status`,
  },
  CITIES: {
    BASE: `${BASE}/api/cities`,
    BY_ID: (id: number) => `${BASE}/api/cities/${id}`,
    CREATE: `${BASE}/api/cities`,
    UPDATE: (id: number) => `${BASE}/api/cities/${id}`,
    BUDGET: (id: number) => `${BASE}/api/cities/${id}/budget`,
    BUDGET_TRANSACTIONS: (id: number) => `${BASE}/api/cities/${id}/budget-transactions`,
    ALLOCATE: (id: number) => `${BASE}/api/cities/${id}/allocate`,
    ADJUST: (id: number) => `${BASE}/api/cities/${id}/adjust`,
  },
  BRANCHES: {
    BASE: `${BASE}/api/branches`,
    BY_ID: (id: number) => `${BASE}/api/branches/${id}`,
    BY_CITY: (cityId: number) => `${BASE}/api/branches/city/${cityId}`,
    CREATE: `${BASE}/api/branches`,
    UPDATE: (id: number) => `${BASE}/api/branches/${id}`,
  },
  BLOCKS: {
    BASE: `${BASE}/api/blocks`,
    BY_ID: (id: number) => `${BASE}/api/blocks/${id}`,
    BY_BRANCH: (branchId: number) => `${BASE}/api/blocks/branch/${branchId}`,
    CREATE: `${BASE}/api/blocks`,
    UPDATE: (id: number) => `${BASE}/api/blocks/${id}`,
    VACANCY: (id: number) => `${BASE}/api/blocks/${id}/vacancy`,
  },
  BUDGETS: {
    BASE: `${BASE}/api/budgets`,
    BY_CITY: (cityId: number) => `${BASE}/api/budgets/city/${cityId}`,
    UPDATE: (id: number) => `${BASE}/api/budgets/${id}`,
  },
  TRAININGS: {
    BASE: `${BASE}/api/trainings`,
    BY_ID: (id: number) => `${BASE}/api/trainings/${id}`,
    CREATE: `${BASE}/api/trainings`,
    UPDATE: (id: number) => `${BASE}/api/trainings/${id}`,
    ACTIVE: `${BASE}/api/trainings/active`,
  },
  TRAINING_ASSIGNMENTS: {
    BASE: `${BASE}/api/training-assignments`,
    ASSIGN: `${BASE}/api/training-assignments`,
    BULK_ASSIGN: `${BASE}/api/training-assignments/bulk`,
  },
  ASSET_ASSIGNMENTS: {
    BASE: `${BASE}/api/asset-assignments`,
    BY_ID: (id: number) => `${BASE}/api/asset-assignments/${id}`,
    ASSIGN: `${BASE}/api/asset-assignments`,
    RETURN: (id: number) => `${BASE}/api/asset-assignments/${id}/return`,
    BY_TRAINEE: (traineeId: number) =>
      `${BASE}/api/asset-assignments/trainee/${traineeId}`,
  },
  RELEASED: {
    BASE: `${BASE}/api/released`,
    BY_ID: (id: number) => `${BASE}/api/released/${id}`,
    BY_DOMAIN: (domain: string) => `${BASE}/api/released/domain/${domain}`,
  },
  PROJECT_ALLOCATIONS: {
    BASE: `${BASE}/api/project-allocations`,
    BY_ID: (id: number) => `${BASE}/api/project-allocations/${id}`,
    ALLOCATE: `${BASE}/api/project-allocations`,
    BY_PROJECT: (projectId: number) =>
      `${BASE}/api/project-allocations/project/${projectId}`,
    BY_RELEASED: (releasedId: number) =>
      `${BASE}/api/project-allocations/released/${releasedId}`,
  },
  DASHBOARD: {
    STATS: `${BASE}/api/dashboard/stats`,
    PENDING_ACTIONS: `${BASE}/api/dashboard/pending-actions`,
    RMG_STATS: `${BASE}/api/dashboard/rmg-stats`,
    ADMIN_STATS: `${BASE}/api/dashboard/admin-stats`,
    CHARTS: `${BASE}/api/dashboard/charts`,
    APPLICATION_CHART: `${BASE}/api/dashboard/charts/applications`,
    ASSESSMENT_CHART: `${BASE}/api/dashboard/charts/assessments`,
    BGV_CHART: `${BASE}/api/dashboard/charts/bgv`,
    TRAINING_CHART: `${BASE}/api/dashboard/charts/training`,
    PROJECT_CHART: `${BASE}/api/dashboard/charts/projects`,
    BUDGET_CHART: `${BASE}/api/dashboard/charts/budget`,
  },
} as const;
