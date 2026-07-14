# Fix Full-Stack Regressions in Candidate BGC and Joining Batch Workflows

**Role:** Act as a senior full-stack engineer working on the NexHire application.

Recently, multiple changes were implemented in the Background Verification and Joining Batch modules. The new business features were added, but several regressions now prevent the workflows from functioning correctly.

**Objective:** Perform a complete full-stack investigation and fix the actual root causes.

**Do not make isolated UI patches.** Trace the complete workflow across:

- Angular components
- Angular services
- Route and authentication handling
- HTTP requests and interceptors
- Spring Boot controllers
- Service-layer logic
- DTO and entity mapping
- Repository queries
- PostgreSQL persistence
- Transaction handling
- Role-based authorization

The application contains separate **Candidate**, **HR**, and **Admin** portals.

---

## Main Problems

There are currently two critical problem areas:

1. The Candidate BGC page is not loading.
2. Joining batches are not being reliably persisted or fetched after refresh, especially after a candidate accepts a joining letter.

Some actions appear to work during the current browser session, but the workflow breaks after navigation or browser refresh. This suggests that parts of the application may still depend on local or in-memory state, incomplete persistence, invalid response mapping, or broken backend queries.

---

## Part 1: Preserve Existing BGC Business Requirements

The following BGC requirements were recently implemented and must not be removed or weakened while fixing the regressions.

### Required and Optional Documents

The BGC workflow must support required and optional document categories.

Example required documents:

- Government ID
- Address Proof
- Education Certificate
- Photograph

Example optional documents:

- Previous Employment Proof
- Experience Letter
- Salary Slips
- Other Supporting Documents

The candidate must not be able to submit the BGC form until all required documents are uploaded.

Optional documents may remain empty.

---

### PDF Validation

Only PDF files must be accepted for BGC document uploads.

The same validation must be enforced consistently across all document-upload actions.

Invalid files must produce a user-friendly message.

Do not rely only on frontend validation. Validate the file type on the backend as well.

---

### Submission Confirmation

When the candidate clicks Submit Documents, show a confirmation dialog explaining that documents will be locked after submission.

The dialog must provide:

- Cancel
- Submit

The candidate must be able to cancel without changing the current submission state.

---

### Lock After Submission

After successful submission:

- Uploaded documents become locked.
- Upload, replace and delete actions become disabled.
- The candidate sees that the submission is under verification.
- The locked state must remain after browser refresh.

---

### HR Reopen Functionality

HR must be able to reopen a candidate’s BGC submission.

After reopening:

- The candidate receives upload access again.
- Existing uploaded documents remain visible.
- The candidate can upload missing documents.
- The candidate can replace rejected documents.
- The candidate must submit again.
- The submission becomes locked again after resubmission.

Only authorized HR users may perform this action.

---

### Rejected Document Workflow

When HR rejects one or more documents:

- The candidate sees the rejection reason.
- Only rejected documents require re-upload.
- Approved documents remain locked.
- Rejected documents become editable.
- The candidate resubmits after correcting the rejected documents.

---

### BGC Clearance Validation

HR must not be able to mark BGC as CLEARED unless every required document has the status:

`APPROVED`

BGC must not be cleared when any required document is:

- `Pending Upload`
- `Uploaded`
- `Submitted`
- `Under Review`
- `Rejected`
- `Re-upload Required`

This validation must exist on both the frontend and backend.

The backend must reject direct API requests that attempt to bypass the rule.

Do not remove these requirements while fixing the loading problem.

---

## Part 2: Fix Candidate BGC Page Loading Failure

### Current Behaviour

The Candidate Portal BGC page is not loading correctly.

The HR Portal BGC page loads successfully, but the Candidate BGC page cannot be used. Because of this, the complete Candidate-to-HR BGC workflow cannot currently be tested.

The fact that the HR page loads does not prove that the candidate-specific endpoint, DTO mapping or authorization logic is correct.

---

### Required Investigation

Trace the Candidate BGC page from route initialization to database response.

Investigate all of the following:

#### Frontend

- Candidate BGC component initialization
- Route configuration
- Candidate route guards
- Authentication state restoration after refresh
- Candidate ID or user ID retrieval
- Token parsing
- Role detection
- Service method used to fetch BGC details
- API endpoint URL
- Query parameters and route parameters
- Loading state handling
- Error state handling
- Null and undefined value handling
- Document list mapping
- Required and optional document mapping
- Status enum mapping
- Date parsing
- File metadata mapping
- Rejection reason mapping
- Submitted and locked state mapping

Check whether the component is directly accessing properties before the API response is available.

Check whether a failed API request is leaving the page permanently in the loading state.

Check whether the frontend expects a response format different from what the backend currently returns.

---

#### Backend

Investigate:

- Candidate BGC controller endpoint
- Candidate authorization rules
- Logged-in user to candidate-profile mapping
- Candidate ID lookup
- BGC record lookup
- Candidate-to-BGC relationship
- Document category lookup
- Required and optional document configuration
- DTO conversion
- Entity relationships
- Enum conversion
- Lazy-loading problems
- JSON serialization problems
- Missing BGC record handling
- Missing document record handling
- Repository query filters
- Tenant or organization filtering, if applicable

---

### Required Behaviour for Missing BGC Records

The Candidate BGC page must support both cases.

#### Case A: Existing BGC Record

When a BGC record already exists:

- Load the current BGC status.
- Load all document categories.
- Load all uploaded documents.
- Load approval, rejection and re-upload statuses.
- Load rejection reasons.
- Preserve the locked or reopened state.

#### Case B: No BGC Record Yet

When no BGC record exists:

- Do not crash the page.
- Return or create a valid initial BGC state according to the current application architecture.
- Show the required and optional document categories.
- Allow the candidate to begin uploading documents.

A missing BGC record must not result in a null-pointer exception, blank page or infinite loading state.

---

### Expected Result

After the fix:

- Candidate BGC page loads after login.
- Candidate BGC page loads after browser refresh.
- Required and optional document categories appear correctly.
- Previously uploaded documents remain visible.
- Submitted documents remain locked.
- Reopened documents become editable where permitted.
- Approved documents remain locked.
- Rejected documents show the rejection reason.
- Loading indicators stop in both success and failure cases.
- User-friendly errors appear only for genuine failures.

No API path, stack trace, SQL error or technical implementation detail is shown to the user.

---

## Part 3: Fix Joining Batch Persistence and Reload Failure

### Current Workflow

The following operations currently appear to work temporarily:

1. HR creates a joining batch.
2. The newly created batch may appear in the current session.
3. HR sends joining letters.
4. The candidate receives the joining letter.
5. The candidate can accept the joining letter.

After that, the workflow breaks.

---

### Current Failure

After candidate acceptance or browser refresh:

The HR Joining Batches page stops loading correctly.

Previously created batches are not displayed.

The page shows:

> **No joining batches yet**

even though batches exist.

A generic error toast is shown:

> **Something went wrong on our end.**  
> Please try again.

HR cannot reopen or continue managing the batch.

Existing joining-letter and acceptance data cannot be accessed through the batch page.

This behaviour indicates that one or more of the following may be occurring:

- The batch is not being persisted correctly,
- The batch-candidate relationship is broken.
- The joining-letter acceptance update corrupts related data.
- The batch-list API fails after acceptance.
- The frontend converts an API failure into an empty result.

Do not assume the cause. Confirm it through code, logs and database records.

---

## Part 4: Investigate Batch Creation

Trace the complete create-batch operation.

Verify:

- The create-batch button calls the correct API.
- The request payload contains all required fields.
- Date fields use the correct format.
- Location, city and block IDs are valid.
- Candidate IDs are valid.
- Batch name generation works correctly.
- Candidate ordering rules are preserved.
- The backend validates batch capacity.
- The backend transaction commits.
- The joining batch record is saved.
- Batch-candidate mapping records are saved.
- Block allocation is saved where applicable.
- Budget records are updated only according to the intended business rule.
- The API returns the actual saved entity or DTO with a persistent ID.
- The frontend uses the persisted API response.
- The frontend does not generate a temporary local-only batch.
- The frontend does not show success before the backend confirms persistence.
- No mock service or in-memory store is being used in the production flow.

After creation, refresh the page and confirm that the batch still exists.

---

## Part 5: Investigate Fetching All Joining Batches

Trace the Joining Batches page initialization.

Verify:

- The batch-list API is called when the page opens.
- The API is called again after browser refresh.
- Authentication is restored before the request runs.
- HR identity and role are resolved correctly.
- Organization, tenant or HR ownership filters are correct.
- Repository queries return existing batches.
- Valid batches are not excluded by incorrect status filters.
- Soft-delete filters are not excluding active records.
- DTO conversion works for batches with and without joining letters.
- DTO conversion works after candidate acceptance.
- Entity relationships do not produce recursive JSON serialization.
- Lazy-loaded relationships do not fail outside a transaction.
- Null status fields are handled safely.
- Enum values match between database, backend and frontend.
- Date values are serialized consistently.
- Empty state appears only after a successful response with zero batches.

Do not show the empty state when the API has failed.

---

## Part 6: Investigate Sending Joining Letters

Verify the complete joining-letter send flow.

Check:

- Joining-letter records are saved to the database.
- Each letter is associated with the correct candidate.
- Each letter is associated with the correct batch.
- Sent status is persisted.
- Generated and sent timestamps are valid.
- Candidate portal fetches the saved joining letter from the backend.
- Sending a letter does not overwrite or detach the batch.
- Sending a letter does not delete or replace batch-candidate mappings.
- The backend returns the updated persisted state.
- Refreshing either portal does not remove the joining letter.

---

## Part 7: Investigate Candidate Joining-Letter Acceptance

This operation appears to trigger or expose the main batch failure.

Trace the complete acceptance operation.

Investigate:

- Candidate acceptance endpoint
- Authentication and candidate ownership validation
- Joining-letter lookup
- Batch lookup
- Candidate-batch mapping lookup
- Joining-letter status update
- Candidate joining status update
- Acceptance timestamp
- Batch accepted-candidate count
- Batch status recalculation
- Batch capacity calculation
- Block allocation
- Budget deduction, if connected
- Transaction boundaries
- Entity save order
- Cascading entity operations
- Orphan removal
- Duplicate mappings
- Null values introduced during acceptance
- Enum conversion
- Repository query behaviour after acceptance
- DTO mapping after acceptance
- JSON serialization after acceptance

Candidate acceptance must update only the relevant records.

It must not:

- Delete the joining batch.
- Remove the candidate from the batch.
- Break the batch-candidate mapping.
- Set required foreign keys to null.
- Replace the batch with a partial object.
- Corrupt the batch status.
- Cause the batch-list endpoint to fail.
- Create duplicate acceptance records.
- Leave the operation partially saved.

Use a transaction so that either the complete acceptance operation succeeds or all changes roll back.

---

## Part 8: Check for Common Regression Causes

Specifically investigate whether any of the following are occurring:

- Newly created batches exist only in frontend memory.
- A mock service is still being used.
- The create-batch API returns incomplete data.
- The batch is saved but candidate mappings are not saved.
- Joining letters are saved without a valid batch relationship.
- Candidate acceptance updates the wrong record.
- Candidate acceptance removes the candidate from the batch.
- Candidate acceptance replaces a managed entity with a partial DTO.
- Cascade configuration deletes related records.
- Orphan removal removes candidate mappings.
- The batch-list query fails for ACCEPTED joining-letter status.
- Angular and Spring Boot use different enum strings.
- Database enum values differ from backend values.
- A DTO mapper does not support accepted candidates.
- A null field is introduced after acceptance.
- Recursive relationships cause JSON serialization failure.
- Lazy-loading causes serialization exceptions.
- The frontend catches a real API error and returns an empty array.
- Empty-state rendering occurs before loading completes.
- The frontend is relying on navigation state rather than backend persistence.
- A recent shared DTO, interceptor, status enum or error-handler change broke both modules.

Confirm the actual root cause before modifying the code.

---

## Part 9: Correct Frontend Loading, Empty and Error States

Both the Candidate BGC page and Joining Batches page must have separate states:

- `isLoading`
- `data`
- `error`

The rendering rules must be:

- **While loading:** Show a loading indicator.
- **Successful response with records:** Show the records.
- **Successful response with zero records:** Show the empty state.
- **Failed request:** Show an error state or a user-friendly error message.

Do not show the empty state during an API failure.

Do not use error handling such as:

`catchError(() => of([]))`

when it converts a backend failure into a fake successful empty result.

Use finalize or equivalent logic so the loading state always ends.

Also ensure:

- No duplicate initialization requests.
- No duplicate form submissions.
- No nested subscriptions where avoidable.
- No direct access to undefined response properties.
- No dependency on navigation history.
- API responses remain the source of truth.
- Local state is refreshed after create, send, accept, reopen, submit, approve and reject actions.

---

## Part 10: Improve Backend Error Handling

The backend must:

- Return correct HTTP status codes.
- Return a stable, user-safe error response.
- Log detailed internal exceptions server-side.
- Preserve transaction integrity.
- Validate resource ownership and role permissions.
- Validate required IDs before accessing entities.
- Return 404 when a resource does not exist.
- Return 400 for invalid input.
- Return 409 for invalid workflow transitions or conflicts.
- Return 403 for unauthorized actions.
- Return 500 only for unexpected server failures.

Do not:

- Return 200 when the operation failed.
- Return incomplete data after partial persistence.
- Expose stack traces.
- Expose SQL errors.
- Expose backend class names.
- Expose endpoint paths in user-facing toast messages.
- Hide backend failures by returning an empty list.

---

## Part 11: Verify PostgreSQL Data at Every Step

Inspect the database after each stage.

### Joining Batch Flow

Check records:

1. Before batch creation
2. After batch creation
3. After sending joining letters
4. After candidate acceptance
5. After refreshing the HR page

Verify consistency of:

- Joining batch
- Batch-candidate mapping
- Joining letter
- Candidate
- Candidate joining status
- Batch status
- Joining-letter status
- City and location mapping
- Block allocation
- Budget records, if applicable

Check for:

- Missing foreign keys
- Orphan records
- Duplicate mappings
- Unexpected deletes
- Null status fields
- Invalid enum values
- Partial transactions
- Rollbacks
- Records saved in one table but not linked correctly to another

### BGC Flow

Verify:

- Candidate BGC record
- Required document categories
- Optional document categories
- Candidate document records
- Submission status
- Document status
- Rejection reason
- Reopen state
- Resubmission state
- Overall BGC status

---

## Part 12: Mandatory End-to-End Verification

Do not mark the task complete until all of the following tests pass.

### Test 1: Candidate BGC Initial Load

1. Log in as a candidate.
2. Open the BGC page.
3. Verify required and optional document categories load.
4. Refresh the browser.
5. Verify the page loads again.
6. Verify no infinite loading or blank page occurs.

---

### Test 2: Candidate BGC Submission

1. Upload all required PDF documents.
2. Leave optional documents empty.
3. Click Submit Documents.
4. Verify the confirmation dialog appears.
5. Confirm submission.
6. Verify documents become locked.
7. Refresh the browser.
8. Verify the submission and locked state remain persisted.

---

### Test 3: HR BGC Review and Clearance Validation

1. Log in as HR.
2. Open the candidate’s BGC.
3. Approve some required documents.
4. Reject one required document.
5. Verify the rejection reason is saved.
6. Verify BGC cannot be cleared.
7. Verify the backend rejects a direct clearance request.
8. Reopen the candidate submission or request re-upload.
9. Log in as the candidate.
10. Verify only the rejected document is editable.
11. Verify approved documents remain locked.
12. Re-upload the rejected document.
13. Resubmit.
14. Approve all required documents.
15. Verify BGC can now be cleared.
16. Refresh both portals and verify all statuses remain persisted.

---

### Test 4: Joining Batch Creation and Persistence

1. Log in as HR.
2. Create a joining batch.
3. Confirm the batch exists in PostgreSQL.
4. Confirm candidate mappings exist.
5. Refresh the HR page.
6. Verify the batch remains visible.
7. Navigate away and return.
8. Verify the batch still loads.

---

### Test 5: Joining Letter Send

1. Open the created batch.
2. Send joining letters.
3. Confirm joining-letter records exist in PostgreSQL.
4. Refresh the HR page.
5. Verify sent status remains visible.
6. Log in as the candidate.
7. Verify the joining letter is available.
8. Refresh the Candidate Portal.
9. Verify the joining letter still loads.

---

### Test 6: Candidate Acceptance

1. Candidate accepts the joining letter.
2. Confirm the acceptance status is saved in PostgreSQL.
3. Confirm the acceptance timestamp is saved.
4. Confirm the batch-candidate relationship still exists.
5. Return to the HR Portal.
6. Open Joining Batches.
7. Refresh the browser.
8. Verify:
   - The batch remains visible.
   - Candidate acceptance is visible.
   - Joining-letter status remains accepted.
   - The page does not freeze.
   - The page does not show a false empty state.
   - No generic error toast appears.
   - No records are lost.
   - HR can continue managing the batch.

---

### Test 7: Genuine API Failure

1. Simulate a real batch-list API failure.
2. Verify an error state is shown.
3. Verify the page does not display “No joining batches yet.”
4. Verify the user sees a meaningful message.
5. Verify technical details are logged server-side but not exposed in the UI.

---

## Acceptance Criteria

The task is complete only when all of the following are true:

- Candidate BGC page loads correctly.
- Candidate BGC page works after browser refresh.
- Required and optional documents load correctly.
- Existing uploaded documents remain visible.
- Submitted documents remain locked.
- Reopened submissions work correctly.
- Rejected documents can be re-uploaded.
- Approved documents remain locked.
- HR cannot clear BGC until all required documents are approved.
- Backend clearance validation cannot be bypassed.
- HR BGC page continues working.
- Joining batches are persisted in PostgreSQL.
- Batch-candidate mappings are persisted.
- Existing batches load after refresh.
- Joining letters remain persisted.
- Candidate acceptance remains persisted.
- Candidate acceptance does not corrupt batch data.
- Batch-list API works after candidate acceptance.
- Empty state appears only after a successful zero-record response.
- Genuine errors display a meaningful user-safe message.
- No production workflow relies on mock or in-memory data.
- No API path, SQL error or stack trace appears in a toast.
- Frontend build passes.
- Backend build passes.
- Relevant automated tests pass.
- No existing Candidate, HR or Admin feature is broken.

---

## Required Final Report

After completing the fixes, provide a report containing:

1. Root cause of the Candidate BGC page failure.
2. Root cause of the batch creation or persistence failure.
3. Root cause of existing batches not loading after refresh.
4. Root cause of the failure after candidate acceptance.
5. Frontend files changed.
6. Backend files changed.
7. Database or migration changes.
8. APIs added or modified.
9. DTO or entity mappings changed.
10. Transactions added or corrected.
11. Business rules preserved.
12. Tests performed.
13. Test results.
14. Remaining risks or untested edge cases.

Do not claim that the issue is fixed based only on the current browser session.

The complete workflows must be verified through:

```text
Frontend action
→ API request
→ backend business logic
→ PostgreSQL persistence
→ browser refresh
→ data fetched again
```

Do not hide errors, hardcode data, replace failed responses with empty arrays or remove existing business rules to make the page appear functional.
