# NexHire — End-to-End Feature Flows (current implementation)

This describes the flow for each major feature as currently implemented in code — from user action to database update to UI response. Use this to compare against `problems.md` / `context_pictures/` and spot where actual behavior diverges from the intended design.

## 1. Candidate Profile Completion

**Files:** `candidate-profile-stepper.component.ts` (FE) → `CandidateProfileController` → `CandidateProfileService.java` (BE) → `candidate_profiles` / `candidate_location_preferences` tables.

1. Candidate opens the 4-step wizard (Personal → Academic → Skills & Resume → Location). `ngOnInit()` calls `GET /api/candidate-profile/me`, patches all 4 `FormGroup`s from the response, and calls `applyLocks()`.
2. **Locking rule**: each step is independently locked based on whether its *anchor field* is already non-null on the loaded profile (`personalLocked` ⇐ `dateOfBirth != null`, `academicLocked` ⇐ `graduationDegree != null`, `skillsLocked` ⇐ `primarySkills != null`, `locationLocked` ⇐ exactly 3 saved preferences). Locked groups are `.disable()`d — greyed out, read-only.
3. Candidate fills a step and clicks **"Save and Next"** → `saveStep(form, label)`:
   - If the group is already disabled (locked), no network call — just advances the stepper.
   - Else validates only *that* step's group. On failure: `markAllAsTouched()` + toast, no navigation.
   - On success: `buildPayload()` assembles a **full** request from `getRawValue()` of **all four** groups (not just the current one — the backend does a full overwrite, so every field must be resent every time or it'd be nulled).
4. `PUT /api/candidate-profile/me` → `CandidateProfileService.updateProfile()`: loads or creates the `CandidateProfile` row, overwrites every field from the request, saves location preferences (must be exactly 3, unique, case-insensitive) via `saveLocationPreferences()`, then calls `applyCompleteness()`.
5. `applyCompleteness()` re-runs `computeMissingFields()` (DOB, gender, address/city/state/pincode, 10th/12th/grad blocks, primary skills, resume file, 3 location prefs) and sets `profileCompleted` + `completedAt` accordingly, then persists.
6. Response flows back → FE sets `this.profile`, re-runs `applyLocks()` (the just-saved step is now disabled), toasts `"<Section> saved."`, advances `stepper.next()`.
7. Resume upload is a **separate**, immediate side-channel: `onResumeSelected()` → `POST /api/candidate-profile/me/resume` (multipart) → `CandidateProfileService.uploadResume()` stores the file via `FileStorageService`, links it to the profile, recomputes completeness — independent of the step-save flow above.
8. Final "Review" step's Save button (`save()`) is the only place that re-validates **all four** groups together before toasting "Profile completed!" — this is what actually flips `profileCompleted=true` if every field is present.

## 2. Job Discovery + Apply (eligibility gate)

**Files:** `jobs-list`/`job-details`/`application-form` components (FE) → `ApplicationController` → `ApplicationService.applyToJob()` (BE) → `job_applications` table.

1. Candidate lands on Jobs List, which queries only `active=true` jobs (currently exactly one seeded "hiring drive" job).
2. FE loads the candidate's own `CandidateProfile` and computes eligibility client-side via `eligibility.util.ts`: `tenthPercentage >= 60 && twelfthPercentage >= 60 && graduationCgpa >= 6.0`. If false, the Apply button is disabled with an inline reason tooltip — this is purely cosmetic/UX, no network call is blocked by it.
3. Candidate clicks Apply → `POST /api/applications` with `jobId`.
4. `ApplicationService.applyToJob()` does, **in order**: (a) profile-completeness check (`candidateProfileService.isProfileComplete()`) — rejects with `BusinessRuleException` if false; (b) **server-side eligibility re-check** (same 60/60/6.0 rule, defense-in-depth against a bypassed/stale frontend) — rejects if false; (c) duplicate-application check (`existsByUserIdAndJobId`) — rejects if already applied.
5. On success, a new `JobApplication` row is inserted with `status = APPLIED`. Response (including the candidate's `passoutYear`, looked up live from `CandidateProfileRepository`) flows back to the FE, which navigates to the applications/tracking view.

## 3. HR Assessment Scoring (Excel-only, no manual entry)

**Files:** `assessments.component.ts` (FE) → `AssessmentController` → `AssessmentExcelService.java` (BE) → `assessment_results` + `job_applications` + (cascades into) `offer_letters`.

1. HR downloads the template (`template()` — fixed headers: ApplicationId, CandidateEmail, Score, Result, Remarks), fills it offline, uploads it back.
2. **Validate phase** (`POST /api/assessments/excel/validate`, no writes): `parseAndValidate()` re-parses the sheet row by row — checks ApplicationId is numeric and non-duplicate-within-file, application exists, CandidateEmail exists and belongs to that application, application status is `APPLIED` or `ASSESSMENT_ASSIGNED` (any other status → row error), score is numeric, and Result is either an explicit PASS/FAIL string or, if blank, derived from a cutoff score HR supplies. Returns a preview + per-row errors; nothing is persisted yet.
3. HR reviews the preview/error list in the UI, then clicks **Commit**.
4. **Commit phase** (`POST /api/assessments/excel/commit`): re-parses and re-validates the *same file* from scratch (stateless between phases — doesn't trust anything the client echoed back), then for each valid row calls `applyRow()`:
   - Upserts an `AssessmentResult` (score, remarks, evaluator, timestamp).
   - Sets application status → `ASSESSMENT_SCORE_UPLOADED`, saves.
   - If passed: status → `ASSESSMENT_PASSED`, saves, then **immediately** calls `offerGenerationService.generateIfAbsent()` (same transaction), which generates a PDF, stores it, creates an `OfferLetter` row, and flips status again → `OFFER_GENERATED`. So a passing row ends the transaction at `OFFER_GENERATED`, not `ASSESSMENT_PASSED` — the intermediate status is transient/never visible to a later read.
   - If failed: status → `ASSESSMENT_FAILED`, stops there — no offer.
5. A `BulkUploadLog` row (+ per-row `BulkUploadErrorRow`s for anything that failed validation) is written for audit/history, and an `AuditLogService` entry is recorded.
6. FE's single-column "Assessment Status" list re-fetches applications and derives a display status per row: no `AssessmentResult` yet → "Result in Progress"; else Passed/Failed from the application's current/cumulative status.

There is **no manual score-entry or pass/fail button anywhere in this flow** — Excel commit is the only write path into `AssessmentResult`.

## 4. Offer: Send → Accept/Reject → Auto-BGC

**Files:** `offer-letters.component.ts` (HR) / My Offers (candidate) → `OfferController` → `OfferService.java` (BE) → `offer_letters` + `job_applications` + `background_verifications`.

1. `OfferGenerationService.generateIfAbsent()` (step 4 above) has already created the `OfferLetter` row at `OFFER_GENERATED`. HR's Offer Letters page lists everything `offerLetterRepository.findAll()` returns — i.e., **every** application that ever passed assessment, sorted by score descending. This is deliberately structural: any candidate reaching `ASSESSMENT_PASSED` via *any* path (Excel commit being the only one now) is guaranteed to have an offer row.
2. HR clicks **Send** (individually or via bulk-send) → `PUT /api/offers/{id}/send` → `OfferService.sendOffer()`: requires status == `OFFER_GENERATED` (else `InvalidStateTransitionException`), stamps `sentBy`/`sentAt`, application status → `OFFER_SENT`, writes an audit log, and fires an in-app notification (`notificationService.notify(...)`, type `OFFER_RECEIVED`) to the candidate.
3. Candidate opens My Offers, sees the offer at status `SENT`, and the Accept/Reject buttons render (gated on `offer.status === 'SENT'` in the FE).
4. **Accept** → `PUT /api/offers/{id}/accept` → `OfferService.acceptOffer()`: verifies status is `OFFER_SENT` and the requester owns the application, sets status → `OFFER_ACCEPTED`, then **synchronously calls `bgvService.autoInitiate()`** in the same transaction — which (if no BGC case exists yet) creates a `BackgroundVerification` row at `DOCUMENTS_PENDING` and advances the application status again → `BGC_DOCUMENTS_PENDING`. So "accept" and "BGC starts" are one atomic step, not two.
5. **Reject** → `PUT /api/offers/{id}/reject` → same guard checks, status → `OFFER_REJECTED`, no BGC.
6. Downstream (outside this session's scope, unchanged): HR/vendor progresses the BGC case through document upload → vendor request → `CLEARED`/`FAILED`, which on `CLEARED` triggers `EmployeeSelectionService.createIfAbsent()` (Employee + SelectedUser rows), advancing status further into `EMPLOYEE_CREATED`/`SELECTED_USER_CREATED`.

## 5. Candidate "Track My Application" (vertical timeline)

**Files:** `candidate-applications.component.ts` (FE only — no new backend endpoint; reuses `GET /api/applications/my`).

1. On load, fetches all of the candidate's applications, then `mostAdvanced()` picks the single application whose status maps to the highest `STAGE_OF_STATUS` index (since in practice there's one active drive).
2. `buildTimeline()` maps that one application's current status onto a fixed 7-stage sequence (Applied → Assessment → Offer → Background Check → Joining → Training → Released) using the `STAGE_OF_STATUS` lookup table: every stage index below the current one renders `done`, the current index renders `current` (or a special `failed`/`declined`/`lap` flag state for terminal-negative statuses like `ASSESSMENT_FAILED`, `OFFER_REJECTED`, `BGC_FAILED`, `JOINING_REJECTED`), everything after is `pending`.
3. Only the "Applied" row gets a real per-stage timestamp (`appliedDate`); every other reached/current stage reuses the application's single `updatedAt` field as an approximation, since the DB doesn't record a separate timestamp per pipeline stage — the FE has no way to show "when exactly did Assessment complete" vs "when did Offer start," only "when was this row last touched."
4. This is purely a read/derive view — it performs no writes and polls nothing; it's a one-shot fetch on page load.

## 6. HR Applications Page (read-only tracker)

**Files:** `applications.component.ts` (FE) → `GET /api/applications` → `ApplicationService.getAllApplications()`.

1. Loads all applications (`findAllByOrderByAppliedAtDesc`), each row enriched server-side with `bgvStatus` (looked up live from `BackgroundVerificationRepository`) and `passoutYear` (looked up live from `CandidateProfileRepository`).
2. FE renders a plain searchable/sortable/paginated/exportable table — no selection checkboxes, no bulk-action bar, no status-mutating buttons. This page cannot write to `job_applications` at all; every status transition on an application now happens exclusively through the Excel commit (assessment), offer send/accept/reject, or BGC update endpoints described above.

## 7. Background notification polling (non-blocking)

**Files:** `NotificationService` + `LoaderInterceptor` (FE).

1. `CandidateLayoutComponent`/HR layout starts a `timer(0, 30000)` on init → `fetchUnreadCount()` → `GET /api/notifications/unread-count` every 30s for the life of the session, guarded by an `isPolling` flag so a re-init can't stack a second timer.
2. This request sets `HttpContext().set(SKIP_LOADER, true)`. `LoaderInterceptor` checks that flag first and, if set, passes the request through **without** touching the global full-viewport loader overlay. Every other HTTP call in the app (profile save, apply, Excel commit, etc.) still shows the loader normally.
3. Response just updates a badge count in the layout header — no other UI state changes, no page reload.
