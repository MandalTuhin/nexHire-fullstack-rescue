You are a Senior Solution Architect, Senior Java Spring Boot Developer, Senior Angular Developer, PostgreSQL Database Architect, and Enterprise UI/UX Designer.

I have an existing prototype project named NexHire.

NexHire is a high-volume Employee Onboarding and Transformation Portal.

Technology stack:

Backend:
- Java 17
- Spring Boot
- Spring Data JPA
- Spring Security JWT
- PostgreSQL
- PostgreSQL schema name: dev
- Apache POI for Excel processing
- PDF generation support if already available or add if required

Frontend:
- Angular 17
- Angular Material
- TypeScript
- Route Guards
- HTTP Interceptors
- Role-based portals for CANDIDATE, HR, and ADMIN

Important instruction:
Do not rebuild the project from scratch.

First analyze the existing backend and frontend codebase.

Preserve all working features.

Only modify, extend, and refactor existing code where required.

Maintain backward compatibility with existing APIs wherever possible.

Add new APIs only when required.

Do not remove working functionality unless it conflicts with the required workflow.

The project has two main folders:
1. backend
2. frontend

First inspect the complete project structure.

Understand the existing implementation.

Identify existing modules, APIs, entities, repositories, services, controllers, Angular routes, components, guards, interceptors, models, and UI pages.

Then implement the required workflow end-to-end.

The main goal of NexHire is to reduce repetitive HR manual work using:
- Automation
- Bulk selection
- Bulk actions
- Search
- Filters
- Sorting
- Pagination
- Excel upload/download templates
- Automated status updates
- Batch-wise onboarding
- Batch-wise training
- Dashboard tracking
- Audit logs
- Validation and row-level error reporting

The final product should not look like a prototype only.

It should feel like a real enterprise HR onboarding product.

It should be usable by HR teams, candidates, admins, and training teams.

It should support practical high-volume onboarding.

The system should support:
- Around 5000 job applications
- Around 500 selected/onboarded candidates

Current hiring scope:
There is one job and one role.

Job Name: System Engineer
Role: System Engineer

All candidates apply for the System Engineer job only.

==================================================
PRODUCT EXPERIENCE AND FLOW IMPROVEMENT AUTHORITY
==================================================

You are allowed to improve the frontend workflow, page structure, navigation, and user experience wherever required.

The goal is to make NexHire feel like a real-life enterprise onboarding product.

Do not blindly follow the page structure if a better UX is possible.

If any feature should be moved to a more suitable page, you may move it.

If any feature should be merged with another page, you may merge it.

If any feature should be split into a separate page, you may split it.

If any feature should be redesigned as a wizard, stepper, dialog, dashboard, tab page, or workflow page, you may redesign it.

You may improve the flow by adding:
- Better dashboards
- Step-by-step wizards
- Tab-based pages
- Side navigation
- Action cards
- Status timelines
- Candidate journey tracker
- HR task queue
- Pending action alerts
- Bulk action toolbars
- Review/preview screens before final submission
- Confirmation dialogs
- Clear success/error messages
- Empty states
- Loading states
- Progress indicators
- Better filtering and sorting panels
- Better responsive layout

Your goal is to make the frontend not just functional, but a proper enterprise product.

The final UI should be intuitive for real users.

Candidate should clearly know what step is pending.

HR should clearly know what action is required.

Admin should clearly manage users and master data.

Training/HR users should clearly track batch and trainee progress.

You may redesign frontend navigation if required.

Preserve existing working functionality and backend compatibility wherever possible.

If you change any flow, page placement, or feature location, explain the reason in the final summary.

Examples of allowed UX improvements:
- Move BGC document review into a dedicated HR BGC Detail page if it improves clarity.
- Convert joining batch creation into a multi-step wizard.
- Merge offer letter tracking and offer eligible candidates into one Offer Management page.
- Add a Candidate Journey Timeline in candidate dashboard.
- Add HR Pending Actions dashboard to reduce manual searching.
- Add Smart Filters for Eligible for Assessment, Eligible for Offer, Eligible for BGC, Eligible for Batch, and Eligible for Release.
- Add batch detail tabs such as Overview, Members, Results Upload, LAP, Release, and Audit History.
- Add preview step before Excel data is saved.
- Add confirmation modal before bulk actions.
- Add audit/history tabs where required.

However:
- Do not remove any required business rule.
- Do not weaken validation.
- Do not bypass backend status flow.
- Do not remove role-based security.
- Do not recreate the entire application from scratch.
- Do not break existing APIs unless absolutely required.
- Maintain real-life product usability and enterprise-grade consistency.

==================================================
CORE PORTALS
==================================================

The application must support these portals:
1. Candidate Portal
2. HR Portal
3. Admin Portal
4. Training/Trainer-related functionality inside HR or separate training portal if already present

Roles:
- CANDIDATE
- HR
- ADMIN
- TRAINER if already present or required

Important registration rule:
Only candidates can self-register.

HR, Admin, trainers, and other stakeholders must not self-register.

HR/Admin/stakeholder users can only login using credentials created by Admin.

==================================================
CANDIDATE PORTAL WORKFLOW
==================================================

Candidate registration should collect minimal details only:
- Name
- Email
- Mobile number
- Password
- Confirm password

After registration, candidate logs in and lands on Candidate Dashboard.

Candidate must complete profile before applying for job.

Candidate profile completion should include personal details.

Personal Details:
- Date of Birth
- Gender
- Address
- City
- State
- Pincode

Academic Details:
- 10th details
- 12th details
- Graduation details
- Post-graduation details if applicable
- Marks/CGPA
- Passing year
- University/Board

Skills:
- Primary skills
- Secondary skills
- Certifications if applicable

Resume:
- Resume upload

Location Preferences:
Candidate must provide exactly three unique location preferences.

Location fields:
- Preference 1
- Preference 2
- Preference 3

Validation:
- Candidate cannot apply until profile is complete.
- Candidate must have exactly three unique location preferences.
- Duplicate location preferences should not be allowed.
- Resume should be uploaded before applying if required by existing logic.

Candidate should be able to:
- View available System Engineer job
- Apply for System Engineer job
- Track application status
- View assessment status
- View offer letter as PDF
- Download offer letter PDF
- Accept offer letter
- Reject offer letter
- View BGC section only after BGC is initiated
- Upload BGC documents
- View BGC status
- View joining letter
- Accept joining letter
- Reject joining letter
- View training details after assigned
- View LAP message if applicable
- View final release/allocation status if applicable

Candidate Training Details page should show:
- Batch name
- Joining date
- Training location
- Training program
- Trainer
- Start date
- End date
- Progress bar
- Attendance percentage
- Score
- Final result
- Training status
- LAP message if candidate is in LAP


==================================================
CANDIDATE BGC DOCUMENT UPLOAD
==================================================

Candidate should upload BGC documents only after HR/system initiates BGC.

BGC documents may include:
- Aadhaar card
- PAN card
- Photo
- Resume
- Degree certificate
- Marksheets
- Address proof
- Experience letter if applicable
- Relieving letter if applicable
- Payslips if applicable

For this training/internal project, documents can be stored using the existing file upload logic.

If no file storage is available, store documents in PostgreSQL using BYTEA.


Prefer a file upload storage abstraction so the implementation can later be changed to file system/cloud storage.

BGC document metadata should include:
- documentId
- bgcCaseId
- candidateId
- applicationId
- documentType
- fileName
- fileType
- fileSize
- fileData or filePath/base storage reference
- documentStatus
- uploadedAt
- reviewedBy
- reviewedAt
- remarks

==================================================
HR PORTAL MAIN PURPOSE
==================================================

The HR Portal is the main automation engine.

HR should manage the complete recruitment-to-onboarding workflow using:
- Search
- Advanced filters
- Sorting
- Pagination
- Bulk selection
- Bulk actions
- Excel uploads
- Excel template downloads
- Automated status updates
- Audit logs
- Batch-wise joining
- Batch-wise training

HR should not process candidates one by one unless required.

The main principle is:
Manual Action → Bulk Action → Automated Status Update

==================================================
HR DASHBOARD
==================================================

Create or fix HR Dashboard to show summary cards.

Dashboard cards should include:
- Total System Engineer applications
- Profile completed candidates
- Assessment assigned count
- Assessment score uploaded count
- Assessment passed count
- Assessment failed/rejected count
- Offer letters generated
- Offer letters sent
- Offer accepted count
- Offer rejected count
- BGC initiated count
- BGC documents submitted count
- BGC cleared count
- BGC failed count
- Employees created after BGC cleared
- Selected users created after BGC cleared
- Joining batches created
- Joining letters sent
- Joining accepted count
- Training batches assigned
- LAP candidates
- Passed trainees
- Failed trainees
- Released candidates
- Candidates forwarded/requiring HR action
- Project allocated candidates if existing allocation flow is available

Use professional Angular Material cards.

Use charts or progress indicators if available.

Use clean spacing.

Use status badges.

Use responsive layout.

Add a pending action section if useful.

Pending action examples:
- Candidates eligible for assessment
- Candidates eligible for offer
- Candidates pending BGC documents
- Candidates eligible for batch
- Training batches requiring result upload
- LAP candidates requiring HR review

==================================================
APPLICATIONS PAGE
==================================================

HR should see all candidates who applied for System Engineer job.

Add search by:
- Candidate name
- Email
- Mobile number
- Candidate ID
- Application ID

Add filters by:
- Application status
- Profile completion status
- Location preference
- Qualification
- Experience type
- Assessment status
- Score range
- Offer status
- BGC status
- Joining status
- Batch status
- Training status
- Employee creation status
- Selected user creation status

Add sorting by:
- Application date
- Candidate name
- Assessment score high to low
- Assessment score low to high
- Offer accepted date
- BGC cleared date
- Joining date

Add pagination:
- Server-side pagination is preferred.
- Do not load all 5000 records at once.

Add bulk selection:
- Select current page
- Select all filtered results
- Select top 30
- Select top 60
- Manual selection

Add bulk actions:
- Bulk assign assessment
- Bulk reject candidates
- Bulk shortlist candidates
- Bulk export applications

Applications page should have smart filters:
- Eligible for Assessment
- Assessment Assigned
- Assessment Passed
- Eligible for Offer
- Offer Accepted
- Eligible for BGC
- BGC Cleared
- Eligible for Batch

Every bulk action should show confirmation dialog before processing.

Every bulk action should show success/failure summary after processing.

Every bulk action should create audit log.

==================================================
ASSESSMENT MANAGEMENT
==================================================

Assessment is conducted by a third-party provider.

HR should:
- Filter eligible candidates
- Select candidates manually
- Select all eligible candidates
- Assign assessment in bulk

Assessment statuses:
- NOT_ASSIGNED
- ASSIGNED
- SCORE_UPLOADED
- PASSED
- FAILED
- REJECTED

Assessment result upload:
HR uploads assessment result Excel.

Assessment Excel columns:
- ApplicationId
- CandidateEmail
- Score
- Result
- Remarks

Backend must:
- Read Excel using Apache POI
- Validate rows
- Validate ApplicationId exists
- Validate CandidateEmail exists
- Validate CandidateEmail belongs to ApplicationId
- Validate score is numeric
- Validate Result value
- Detect duplicate ApplicationId rows
- Store upload history
- Store failed row errors
- Return success/failure summary
- Update assessment status
- Update application status

Optional extended template support if already useful:
- CandidateId
- CandidateName
- AssessmentId
- MaxScore

Assessment Excel flow:
1. HR downloads assessment result template.
2. HR uploads filled Excel file.
3. Backend parses Excel using Apache POI.
4. Backend validates all rows.
5. Backend returns preview and row-level errors.
6. HR reviews validation summary.
7. HR submits valid rows.
8. Backend saves results.
9. Backend updates application statuses.
10. Backend stores upload history and failed row errors.

After score upload:
- HR should be able to set cutoff if Result column is not enough or if business wants cutoff-based decision.
- If score >= cutoff, candidate is passed.
- If score < cutoff, candidate is failed/rejected.

Automation:
- Passed candidates should automatically become eligible for offer letter.
- Backend should automatically generate offer letter for passed candidates.
- HR should not manually generate offer letters one by one.

==================================================
OFFER LETTER MANAGEMENT
==================================================

Candidates who passed assessment should have offer letters generated automatically.

HR should:
- View offer-generated candidates
- Filter candidates
- Search candidates
- Sort by score high to low
- Select top 30
- Select top 60
- Select manually
- Bulk send offer letters if sending action exists
- Track offer status

Offer statuses:
- NOT_GENERATED
- GENERATED
- SENT
- ACCEPTED
- REJECTED
- EXPIRED

Candidate should:
- View offer letter properly as PDF
- Download offer letter PDF
- Accept offer
- Reject offer

When candidate accepts offer:
- BGC should be initiated automatically.
- Candidate portal should show BGC section.

Offer PDF should include:
- Candidate name
- Role: System Engineer
- Offer details
- Compensation details if existing
- Company details if existing
- Terms and conditions
- Acceptance instructions

==================================================
BGC MANAGEMENT
==================================================

BGC starts automatically after offer acceptance.

BGC statuses:
- NOT_INITIATED
- INITIATED
- DOCUMENTS_PENDING
- DOCUMENTS_SUBMITTED
- VERIFICATION_IN_PROGRESS
- CLEARED
- FAILED
- RECHECK_REQUIRED

HR should:
- See BGC cases
- Search BGC cases
- Filter BGC cases
- View candidate uploaded documents
- Preview documents where possible
- Download documents
- Mark documents as accepted/rejected/reupload required if existing workflow supports
- Send documents to third-party BGC vendor link
- Store vendor request details

BGC Detail page should show:
- Candidate details
- Application details
- Offer acceptance details
- BGC status
- Uploaded documents
- Vendor request history
- BGC result history
- Audit history

Vendor request details should include:
- vendorRequestId
- bgcCaseId
- applicationId
- candidateId
- vendorName or vendorLink
- requestPayload/reference
- sentBy
- sentAt
- status
- remarks

BGC result upload:
HR uploads BGC result Excel received from third-party vendor.

BGC Excel columns:
- ApplicationId
- CandidateEmail
- BGCStatus
- Remarks

Backend must:
- Read Excel using Apache POI
- Validate rows
- Validate ApplicationId exists
- Validate CandidateEmail exists
- Validate CandidateEmail belongs to ApplicationId
- Validate BGCStatus
- Store upload history
- Store row-level errors
- Return success/failure summary
- Update BGC status

Status mapping:
- CLEARED / PASSED / VERIFIED => BGC CLEARED
- FAILED => BGC FAILED
- PENDING => VERIFICATION_IN_PROGRESS
- RECHECK => RECHECK_REQUIRED

BGC Excel flow:
1. HR downloads BGC result template.
2. Vendor fills BGC result Excel.
3. HR uploads BGC result Excel.
4. Backend validates rows.
5. Backend shows row-level errors.
6. HR confirms valid records.
7. Backend updates BGC status.
8. Backend stores upload history.
9. Backend creates employee and selected_user for cleared candidates.

==================================================
EMPLOYEE AND SELECTED_USER CREATION RULE
==================================================

Very important business rule:
If BGC is CLEARED, then employee must be created immediately.

Employee creation happens before training.

selected_user must also be created immediately after BGC CLEARED.

selected_user must contain employee_id.

Do not delay employee creation until after training.

After BGC CLEARED, backend must transactionally:
- Create employee record if not already created
- Generate or assign employee_id
- Link employee to candidate/application
- Create selected_user record
- Ensure selected_user contains employee_id
- Avoid duplicate employee creation if BGC Excel is uploaded again
- Avoid duplicate selected_user creation if record already exists
- Store audit/history

Important:
Training assignment must use:
- selectedUserId
- candidate employeeId
- trainingId
- blockId
- logged-in HR employeeId as hrId

Make sure HR user is mapped to employeeId if business logic requires it.

If HR employeeId mapping is missing, show proper validation/error message.

Employee creation must be transaction-safe.

selected_user creation must be transaction-safe.

Duplicate creation must be prevented.

==================================================
JOINING BATCH MANAGEMENT
==================================================

After employee and selected_user creation, HR creates joining batches.

Joining and training must be batch-based, not individual-based.

Each batch should have a maximum size based on selected batch size, usually 60.

HR creates joining batch by selecting:
- Joining date
- Joining location
- Training location
- Training program
- Block
- Batch size
- Batch name/code if required

Candidates must be sorted based on:
- Selected joining or training location
- Candidate three location preferences

Priority:
- Preference 1 has highest priority
- Preference 2 has next priority
- Preference 3 has next priority
- Candidates without matching preference come last

Batch assignment should support high-volume assignment:
- Bulk candidate selection
- Select all eligible
- Auto-fill batch up to batch size
- Auto-create multiple batches if required
- Validate max batch size
- Validate candidate eligibility

Only candidates with these conditions should be eligible:
- BGC CLEARED
- Employee created
- selected_user created
- Not already assigned to active joining/training batch

Batch fields:
- batchId
- batchCode
- batchName
- role: System Engineer
- joiningDate
- joiningLocation
- trainingLocation
- trainingProgram/trainingId
- block/blockId
- batchSize
- maxHeadcount
- currentHeadcount
- status
- createdBy
- createdAt

Batch statuses:
- CREATED
- ASSIGNED_TO_TRAINING
- JOINING_LETTER_SENT
- JOINING_ACCEPTANCE_IN_PROGRESS
- READY_FOR_TRAINING
- TRAINING_IN_PROGRESS
- COMPLETED
- COMPLETED_WITH_EXCEPTIONS
- CLOSED
- CANCELLED

If HR selects more candidates than batch capacity, show warning:
"Batch capacity is X. Please select only X candidates or create multiple batches."

Recommended UX:
Joining batch creation should be a wizard.

Joining Batch Wizard steps:
1. Select joining date and joining location
2. Select training location, training program, and block
3. Select batch size
4. View eligible candidates
5. System sorts candidates by location preference
6. HR reviews selected candidates
7. HR confirms batch creation
8. System creates batch

==================================================
JOINING LETTER MANAGEMENT
==================================================

Joining letter should be batch-wise.

All candidates in one batch should have the same:
- Joining date
- Joining location
- Training location
- Training program
- Training start date
- Training end date
- Trainer/coordinator if available

HR should:
- Select batch
- Generate joining letters for batch
- Bulk send joining letters
- Track acceptance

Joining letter statuses:
- NOT_GENERATED
- GENERATED
- SENT
- ACCEPTED
- REJECTED
- EXPIRED

Candidate should:
- View joining letter
- Download joining letter
- Accept joining letter
- Reject joining letter

Only joining-accepted candidates should move to active training if business requires acceptance before training.

Joining letter PDF should include:
- Candidate name
- Employee ID if created
- Role: System Engineer
- Joining date
- Joining location
- Training location
- Training program
- Training start date
- Training end date
- Batch details
- Reporting instructions

==================================================
TRAINING ASSIGNMENT
==================================================

Training assignment must use:
- selectedUserId
- candidate employeeId
- trainingId
- blockId
- logged-in HR employeeId as hrId

Training assignment must support batch-wise high-volume assignment.

Do not implement only individual assignment.

When HR assigns a batch to training and block, backend must validate:
1. selected_user exists
2. selected_user has employee_id
3. employee exists
4. trainingId exists
5. blockId exists
6. logged-in HR has employeeId/hrId
7. block has enough available seats
8. city budget is available
9. candidate is not already trainee in another active batch
10. joining batch is valid

Budget logic:
- Validate city-wise budget
- Deduct city-wise budget using training cost per candidate multiplied by batch size
- Use actual assigned candidate count if batch is not full
- Transaction-safe deduction required
- Prevent negative budget

Block logic:
- Validate block available seats
- Update block occupancy
- Prevent overbooking
- Transaction-safe update required

After successful training assignment:
- Update joining batch status
- Create trainee records for every candidate in the batch
- Link trainee to batch/training/block/employee/selectedUser
- Store audit logs

If any part fails:
- Roll back transaction
- Do not partially deduct budget
- Do not partially update block occupancy
- Do not partially create trainee records

==================================================
TRAINING BATCH DASHBOARD
==================================================

HR should see training batch dashboard.

Dashboard columns:
- Batch name
- Batch code
- Joining date
- Joining location
- Training location
- Training program
- Block
- Trainer if available
- Total candidates
- Passed count
- Failed count
- LAP count
- Released count
- Pending count
- Status
- Progress bar

Progress bar:
Calculate progress from training start date and training end date.

Progress rule:
- Before start date: 0%
- Between start and end date: proportional progress
- After end date: 100%

Add search:
- Batch name
- Batch code
- Training program
- Location
- Block
- Trainer

Add filters:
- Training location
- Joining location
- Training program
- Block
- Batch status
- Training start date
- Training end date

Add sorting:
- Joining date
- Start date
- End date
- Progress
- LAP count
- Released count

Use professional responsive Angular Material UI:
- Cards
- Tables
- Filters
- Search box
- Pagination
- Status badges
- Progress bars
- Action buttons
- Dialogs
- Toast messages

==================================================
TRAINING BATCH DETAIL PAGE
==================================================

When HR clicks a particular training batch, show trainees in that batch.

Each trainee row should show:
- Candidate name
- EmployeeId
- selectedUserId
- TraineeId
- Email
- Mobile
- ApplicationId
- Assessment score
- Joining status
- Training status
- LAP status
- Attendance percentage
- Training score
- Final result
- Released status
- Flag status
- Remarks
- Action buttons

Action buttons:
- Training Complete if applicable
- Move to LAP
- Remove from LAP
- Release if eligible or batch completion handles release
- Forward to HR if applicable

Also provide bulk selection and bulk actions:
- Bulk mark training complete
- Bulk move to LAP
- Bulk remove from LAP
- Bulk export batch report

Recommended UX:
The batch detail page may be organized using tabs:
- Overview
- Members/Trainees
- Result Upload
- LAP
- Release
- Audit History

==================================================
TRAINEE RESULT EXCEL UPLOAD
==================================================

Inside a training batch, HR should upload trainee result Excel for the entire batch.

Excel columns:
- EmployeeId
- TraineeId
- Score
- AttendancePercentage
- FinalResult
- Remarks

Backend must:
- Read Excel using Apache POI
- Validate EmployeeId exists
- Validate TraineeId exists
- Validate trainee belongs to selected batch
- Validate score is numeric
- Validate attendance percentage is numeric
- Validate FinalResult
- Store upload history
- Store failed row errors
- Return success/failure summary
- Update trainee score
- Update attendance
- Update final result
- Update remarks
- Update trainee status where applicable

Recommended Excel flow:
1. Download template
2. Upload Excel
3. Validate rows
4. Show preview
5. Show row-level errors
6. Submit valid rows
7. Save upload log
8. Update database

Do not directly save Excel data without validation and preview if preview workflow exists.


==================================================
LAP FLOW
==================================================

LAP means Learning Assistance Program.

Training should have:
- cutoff_score
- minimum_attendance_percentage

If trainee score is below training cutoff:
- HR should see Move to LAP button.

When HR clicks Move to LAP:
- trainee_status = LAP
- final_result = LAP
- lap_enabled = true
- released record must not be created for that trainee
- Candidate should see LAP message in candidate portal
- Store audit log

HR can toggle Remove from LAP.

When HR clicks Remove from LAP:
- lap_enabled = false
- trainee_status updated appropriately
- final_result reset or updated based on existing result
- Store audit log

Important:
LAP trainees should not block the release of other passed candidates in the same batch.

Release eligibility:
A trainee can be released only if:
- score >= training.cutoff_score
- attendancePercentage >= training.minimum_attendance_percentage
- finalResult is PASSED or COMPLETED
- lap_enabled = false
- traineeStatus is not LAP
- traineeStatus is not FAILED
- traineeStatus is not ON_HOLD
- not already released

==================================================
TRAINING COMPLETION AND RELEASE LOGIC
==================================================

When HR completes a batch, process trainees individually.

For each trainee:
- If trainee is release eligible, create release record.
- If trainee is LAP, failed, on-hold, or not eligible, do not release.
- LAP/failed/on-hold trainees should not block release of eligible trainees.

Batch final status:
- If all trainees released/completed: COMPLETED
- If some released and some LAP/failed/on-hold: COMPLETED_WITH_EXCEPTIONS
- If none released due to errors: keep appropriate failed/in-progress status

Released candidates should move to project allocation using existing logic.

Project allocation existing logic:
- employee.project_id is updated
- project vacancy decreases
- allocated count increases
- allocation history is created

Important:
Training domain and project domain are display-only and should not block allocation.

==================================================
FORWARDED TO HR / EXCEPTION REVIEW
==================================================

If trainee fails, has LAP issue, attendance issue, or requires HR action, HR should see them in an exception/review queue.

HR Review page should show:
- Candidate details
- EmployeeId
- TraineeId
- Batch details
- Training program
- Trainer remarks
- LAP status
- Training status
- Score
- Attendance
- Final result
- Flag reason
- Action history

HR final actions may include:
- Extend training
- Reassign batch
- Keep on hold
- Reject / mark failed
- Approve manually
- Remove from LAP
- Release manually if allowed by business rules

==================================================
GLOBAL STATUS FLOW
==================================================

Use or map to this candidate/application lifecycle where applicable:

APPLIED
PROFILE_COMPLETED
ASSESSMENT_ASSIGNED
ASSESSMENT_SCORE_UPLOADED
ASSESSMENT_PASSED
ASSESSMENT_FAILED
OFFER_GENERATED
OFFER_SENT
OFFER_ACCEPTED
OFFER_REJECTED
BGC_INITIATED
BGC_DOCUMENTS_PENDING
BGC_DOCUMENTS_SUBMITTED
BGC_VERIFICATION_IN_PROGRESS
BGC_CLEARED
BGC_FAILED
EMPLOYEE_CREATED
SELECTED_USER_CREATED
JOINING_BATCH_ASSIGNED
JOINING_LETTER_GENERATED
JOINING_LETTER_SENT
JOINING_ACCEPTED
TRAINING_ASSIGNED
TRAINING_IN_PROGRESS
TRAINING_RESULT_UPLOADED
TRAINING_COMPLETED
LAP
COMPLETED_WITH_EXCEPTIONS
RELEASED
PROJECT_ALLOCATED
ONBOARDED

==================================================
DATABASE REQUIREMENTS
==================================================

Backend uses PostgreSQL schema dev.

Analyze existing database models and migrations first.

Add or update tables only if required.

Possible required modules/tables:
- users
- roles
- candidates
- candidate_profiles
- candidate_location_preferences
- jobs
- job_applications
- assessments
- assessment_assignments
- assessment_results
- offer_letters
- bgc_cases
- bgc_documents
- bgc_vendor_requests
- bgc_results
- employees
- selected_users
- joining_batches
- joining_batch_candidates
- joining_letters
- trainings
- training_blocks
- city_budgets
- training_batches
- trainees
- trainee_results
- lap_history
- release_records
- projects
- allocation_history
- bulk_upload_logs
- bulk_upload_error_rows
- action_audit_logs
- email_logs or notification_logs

Add proper:
- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Created timestamps
- Updated timestamps
- CreatedBy where needed
- UpdatedBy where needed

Important indexes:
- candidate_id
- application_id
- email
- mobile
- employee_id
- selected_user_id
- trainee_id
- batch_id
- training_id
- block_id
- application_status
- assessment_status
- offer_status
- bgc_status
- joining_status
- training_status
- lap_enabled

Add SQL migration scripts for all DB changes.

Do not break existing schema.

Use ALTER TABLE where possible.

Avoid destructive migrations unless absolutely required.

==================================================
BACKEND REQUIREMENTS
==================================================

Add or update entities:
- Candidate
- CandidateProfile
- JobApplication
- Assessment
- AssessmentResult
- OfferLetter
- BgcCase
- BgcDocument
- BgcVendorRequest
- BgcResult
- Employee
- SelectedUser
- JoiningBatch
- JoiningBatchCandidate
- JoiningLetter
- TrainingBatch
- Trainee
- TraineeResult
- LapHistory
- ReleaseRecord
- BulkUploadLog
- BulkUploadErrorRow
- ActionAuditLog

Add or update DTOs:
- Request DTOs
- Response DTOs
- Filter DTOs
- Bulk action DTOs
- Upload summary DTOs
- Row error DTOs

Add or update repositories:
- Add custom query methods for search/filter/pagination.
- Use Pageable for high-volume list APIs.
- Avoid N+1 query problems.
- Use DTO projections where useful.

Add or update services:
- Profile completion service
- Application service
- Assessment assignment service
- Assessment Excel import service
- Offer letter generation service
- PDF generation service
- BGC service
- BGC document service
- BGC vendor service
- BGC Excel import service
- Employee creation service
- SelectedUser creation service
- Joining batch service
- Training assignment service
- Training batch service
- Trainee result Excel import service
- LAP service
- Release service
- Project allocation service integration
- Upload history service
- Audit log service

Add or update controllers:
- Candidate APIs
- HR Application APIs
- Assessment APIs
- Offer Letter APIs
- BGC APIs
- Joining Batch APIs
- Training Batch APIs
- Trainee APIs
- LAP APIs
- Release APIs
- Upload history APIs
- HR Dashboard APIs
- Admin APIs if required

Exception handling:
- Add global exception handler if missing.
- Return clean error responses.
- Return row-level Excel validation errors.
- Return meaningful validation messages.

Security:
- Use Spring Security JWT.
- Candidate can access only own data.
- HR can access HR operations.
- Admin can manage users and master data.
- Trainer, if implemented, can only access assigned batches.
- Do not allow candidate to access HR APIs.

Transactions:
Use @Transactional for:
- BGC cleared employee + selected_user creation
- Batch assignment
- Training assignment
- Budget deduction
- Block occupancy update
- Trainee creation
- Batch completion and release
- Project allocation
- Bulk updates

==================================================
API REQUIREMENTS
==================================================

Authentication APIs:
- Candidate register
- Login
- Role-based access
- Admin-created HR/Admin/stakeholder accounts

Candidate APIs:
- Complete profile
- Check profile completion
- Apply for System Engineer job
- View application status
- View/download offer letter PDF
- Accept/reject offer letter
- Upload BGC documents
- View BGC status
- View/download joining letter
- Accept/reject joining letter
- View training details

HR Application APIs:
- Get applications with pagination
- Search applications
- Filter applications
- Sort applications
- Bulk assign assessment
- Bulk reject
- Bulk export

Assessment APIs:
- Download assessment result Excel template
- Upload assessment result Excel
- Validate Excel
- Preview errors
- Submit/save result
- Set cutoff if required
- Auto-generate offer letters for passed candidates

Offer APIs:
- Get offer eligible candidates
- Bulk send offer letters
- Track offer status

BGC APIs:
- Get BGC cases
- View BGC documents
- Preview/download documents
- Send to vendor link
- Store vendor request
- Download BGC Excel template
- Upload BGC result Excel
- Validate BGC Excel
- Save BGC result
- Auto-create employee and selected_user after BGC CLEARED

Joining Batch APIs:
- Create joining batch
- Update batch
- Get batches
- Get batch details
- Assign candidates to batch
- Auto-sort candidates by location preference
- Auto-create multiple batches if needed
- Generate/send joining letters batch-wise

Training APIs:
- Assign joining batch to training/block
- Validate block seats
- Validate city budget
- Deduct budget
- Create trainee records
- Get training batch dashboard
- Get batch trainees
- Download trainee result template
- Upload trainee result Excel
- Validate trainee result Excel
- Save trainee results
- Move to LAP
- Remove from LAP
- Complete batch
- Release eligible trainees
- Get HR exception queue

Dashboard APIs:
- HR dashboard counts
- Training dashboard counts
- Candidate dashboard summary

==================================================
FRONTEND REQUIREMENTS
==================================================

Analyze existing Angular frontend first.

Add or update Candidate pages:
- Register
- Login
- Candidate Dashboard
- Complete Profile
- Apply Job
- My Applications
- Offer Letter PDF view/download/accept/reject
- BGC Document Upload
- Joining Letter view/download/accept/reject
- Training Details

Add or update HR pages:
- HR Dashboard
- Applications
- Assessment Management
- Assessment Excel Upload
- Offer Letter Management
- BGC Management
- BGC Document Review
- BGC Result Excel Upload
- Joining Batch Wizard
- Joining Letter Management
- Training Batch Dashboard
- Training Batch Detail
- Trainee Result Upload
- LAP/Exception Review
- Reports

Add or update Admin pages:
- User management for HR/Admin/stakeholder users if already available
- Role management if already available
- Master data management if already available

Angular UI requirements:
- Angular Material cards
- Angular Material tables
- Search boxes
- Advanced filters
- Sorting
- Pagination
- Status badges
- Bulk action toolbar
- Select current page
- Select all filtered results
- Select top 30
- Select top 60
- File upload components
- Download template buttons
- Upload Excel buttons
- Validation preview dialog
- Error row table
- Confirmation dialogs
- Toast/snackbar messages
- Progress bars
- Responsive layout
- Professional enterprise UI

Angular services:
- AuthService
- CandidateService
- ApplicationService
- AssessmentService
- OfferLetterService
- BgcService
- JoiningBatchService
- TrainingService
- TraineeService
- LapService
- DashboardService
- AdminService if required

Angular models:
- Candidate
- CandidateProfile
- JobApplication
- AssessmentResult
- OfferLetter
- BgcCase
- BgcDocument
- Employee
- SelectedUser
- JoiningBatch
- TrainingBatch
- Trainee
- TraineeResult
- UploadSummary
- RowError
- DashboardSummary

Routing:
- Protect routes with guards.
- Candidate routes only for CANDIDATE.
- HR routes only for HR.
- Admin routes only for ADMIN.
- Redirect unauthorized users cleanly.

Interceptor:
- Attach JWT token.
- Handle 401/403 errors gracefully.

==================================================
EXCEL PROCESSING REQUIREMENTS
==================================================

For every Excel upload, follow this workflow:

1. Download standard template
2. Upload filled Excel
3. Backend parses Excel using Apache POI
4. Validate all rows
5. Return preview and row-level errors
6. Allow submit/save valid rows
7. Store upload history
8. Store failed row errors
9. Update database statuses automatically
10. Return success/failure summary

Excel upload types:
- Assessment result upload
- BGC result upload
- Trainee result upload
- Optional batch assignment upload if useful

Do not silently ignore failed rows.

Upload history should store:
- uploadId
- uploadType
- fileName
- uploadedBy
- uploadedAt
- totalRows
- successRows
- failedRows
- status
- remarks

Failed row errors should store:
- uploadId
- rowNumber
- identifier/applicationId/employeeId
- errorMessage
- rawData if useful

==================================================
PDF REQUIREMENTS
==================================================

Offer letter:
- Generate PDF automatically for passed candidates.
- Candidate should view PDF properly.
- Candidate should download PDF.
- Candidate should accept/reject offer.

Joining letter:
- Generate PDF batch-wise or per candidate using batch data.
- Candidate should view/download.
- Candidate should accept/reject.

PDF should include:
- Candidate name
- Role: System Engineer
- Offer details
- Joining date if joining letter
- Joining location
- Training location
- Training start/end date
- Batch details where applicable

==================================================
AUTOMATION RULES
==================================================

1. Only candidates can self-register.
2. HR/Admin/stakeholders must be created by Admin.
3. Candidate must complete profile before applying.
4. Candidate must provide exactly three unique location preferences.
5. Candidate applies only for System Engineer job.
6. HR can bulk assign assessments.
7. Assessment results are uploaded through Excel.
8. Passed candidates get offer letters generated automatically.
9. Candidate accepts offer.
10. BGC starts automatically after offer acceptance.
11. Candidate uploads BGC documents after BGC starts.
12. HR uploads BGC result Excel.
13. If BGC is CLEARED, employee is created immediately.
14. If BGC is CLEARED, selected_user is created immediately.
15. selected_user must contain employee_id.
16. Training assignment must use selectedUserId, employeeId, trainingId, blockId, and HR employeeId as hrId.
17. Joining/training assignment must be batch-wise.
18. Candidate sorting for batch should follow location preference priority.
19. Block seats must be validated before assignment.
20. City budget must be validated and deducted transactionally.
21. Trainee records are created for every candidate in assigned batch.
22. Training results are uploaded by Excel.
23. LAP trainees are not released.
24. LAP trainees do not block release of other passed trainees.
25. Batch completion processes each trainee individually.
26. Eligible trainees are released.
27. Batch may become COMPLETED_WITH_EXCEPTIONS.
28. Released candidates move to project allocation using existing logic.
29. Training domain and project domain are display-only and should not block allocation.
30. All bulk actions must create audit logs.
31. All Excel uploads must create upload history and row error logs.

==================================================
PERFORMANCE REQUIREMENTS
==================================================

Because the system handles thousands of records:
- Use server-side pagination.
- Use server-side filtering.
- Use server-side sorting.
- Do not load all 5000 candidates at once.
- Add indexes on frequently searched/filtered columns.
- Use efficient bulk update queries where safe.
- Avoid N+1 query problems.
- Use DTO projections where helpful.
- Keep Excel processing safe for large files.
- Validate Excel before saving.
- Use transactions for multi-table updates.

==================================================
UI/UX REQUIREMENTS
==================================================

Design should be enterprise-grade and professional.

Use:
- Angular Material
- Responsive layout
- Clean dashboard cards
- Data tables
- Progress bars
- Status badges
- Filter panels
- Search box
- Bulk action toolbar
- Confirmation dialogs
- Snackbar/toast messages
- Error summary panels
- Upload progress indicators
- Empty states
- Loading spinners

Every HR list page should have:
- Search
- Filters
- Sort
- Pagination
- Bulk selection
- Bulk action bar
- Export/download option if applicable

Candidate UX should clearly show:
- Profile completion percentage
- Pending steps
- Application status timeline
- Offer letter status
- BGC status
- Joining status
- Training status
- LAP message if applicable

HR UX should clearly show:
- Pending actions
- Eligible candidates for next stage
- Bulk action availability
- Upload validation results
- Batch progress
- Exception candidates requiring HR action

Admin UX should clearly show:
- User management
- Role/user status
- HR/Admin account creation
- Master data if available

==================================================
==================================================
EXPECTED IMPLEMENTATION APPROACH
==================================================

First:
1. Inspect backend and frontend folder structure.
2. Identify frameworks, versions, existing modules, and current workflow.
3. Summarize what already exists.
4. Summarize what is missing.
5. Do not rewrite project from scratch.

Then:
1. Add/update database migration SQL scripts.
2. Add/update backend entities.
3. Add/update repositories.
4. Add/update DTOs.
5. Add/update services and service implementations.
6. Add/update controllers.
7. Add exception handling.
8. Add Excel import services.
9. Add PDF generation if missing.
10. Add upload history and row error tracking.
11. Add transaction-safe employee/selected_user creation.
12. Add joining batch and training batch logic.
13. Add LAP and release logic.
14. Add frontend Angular models.
15. Add frontend services.
16. Add frontend components/pages.
17. Add routing and guards.
18. Add Material UI tables/cards/forms/dialogs.
19. Connect frontend with backend APIs.
20. Ensure all statuses update correctly.

Before finalizing:
- Run backend build/tests if available.
- Run frontend build/lint if available.
- Fix all compile/runtime errors.
- Ensure the app starts successfully.
- Provide a final summary of changed files.
- Provide new APIs added.
- Provide database changes made.
- Provide frontend pages/components added.
- Provide how to run backend and frontend.
- Mention any assumptions made.

==================================================
DELIVERABLE EXPECTATION
==================================================

Provide complete updated files, not tiny snippets, when modifying code.

Preserve existing working functionality.

Do not remove existing features unless they conflict with the required workflow.

In the final implementation summary, also include:
- Any frontend flow changes made for better user experience
- Any pages merged, split, renamed, or moved
- Any new dashboards, wizards, tabs, or dialogs added
- Reason for each major UX decision
- Confirmation that the final product is usable as a real-life HR onboarding platform

The final NexHire system should support the complete flow:

Candidate self-registers
→ Candidate completes profile
→ Candidate applies for System Engineer job
→ HR filters/searches applications
→ HR bulk assigns assessment
→ HR uploads assessment Excel
→ System validates and updates results
→ System generates offer letter for passed candidates
→ Candidate views/downloads/accepts offer PDF
→ BGC starts automatically
→ Candidate uploads BGC documents
→ HR reviews/downloads/sends documents to vendor
→ HR uploads BGC result Excel
→ System updates BGC
→ If BGC CLEARED, employee is created immediately
→ selected_user is created with employee_id
→ HR creates joining batch
→ Candidates sorted by location preference
→ HR assigns batch to training/block
→ System validates seats and budget
→ System deducts budget and updates block occupancy
→ System creates trainee records
→ HR views training batch dashboard
→ HR uploads trainee result Excel
→ System validates and updates trainee results
→ HR moves low-score trainees to LAP
→ HR completes batch
→ Passed eligible trainees are released
→ LAP/failed/on-hold trainees are not released
→ Batch becomes COMPLETED or COMPLETED_WITH_EXCEPTIONS
→ Released candidates move to project allocation using existing logic
→ Candidate sees training and final status in candidate portal.
