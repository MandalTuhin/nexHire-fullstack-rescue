# HR Portal — Joining Batch Module: Business Flow Improvements

The current HR Portal → Joining Batch module is functionally working, but needs to move closer
to a real corporate onboarding process. **Improve the existing implementation — do not rebuild
it.**

## Batch Creation

- Batch Name should no longer be a manual optional field. The system should automatically
  generate a unique Batch Name using a predefined naming convention based on the joining
  location, joining year/month, and sequence number. This ensures consistency and avoids
  duplicate or incorrect batch names.
- Improve all date validations during batch creation:
  - HR should never be able to select a past Joining Date.
  - Training Start Date must always be after the Joining Date.
  - Training End Date must always be after the Training Start Date.
  - These validations should exist on both the frontend and backend.
- When displaying Eligible Candidates, sort them intelligently:
  - First, prioritize candidates whose preferred location matches the selected joining
    location.
  - Within the same location, candidates with higher assessment scores should appear first.
  - This helps HR fill batches more efficiently.

## Joining Letter Process

- The current flow has separate buttons for "Generate Joining Letter" and "Send Joining
  Letter". This is unnecessary. Replace it with a single "Send Joining Letter" action.
- When HR clicks this button, the system should automatically:
  - Generate the joining letter.
  - Store it.
  - Send it to the candidate.
  - Update the candidate status.
  - Reserve the required city budget.
- HR should not have to perform these actions separately.

## Acceptance in Progress

- After joining letters are sent, the batch status should become "Acceptance In Progress".
  During this stage, the system must correctly handle all candidate responses.
- If a candidate **accepts** the joining letter, they remain in the batch and wait for the
  actual joining date.
- If a candidate **rejects** the joining letter:
  - They should automatically be removed from the batch.
  - The reserved budget for that candidate should be released.
  - HR should be allowed to replace that candidate before the training start date.
- If a candidate **neither accepts nor rejects** before the response deadline:
  - The status should become "Joining Expired".
  - HR should then be able to either resend the joining letter or remove and replace that
    candidate before training begins.
- Training should only begin for candidates who actually join the organization. Candidates who
  reject or never respond should never enter the training lifecycle.

## Batch Details Page

- When HR opens an existing batch, do not show "Generate Joining Letter" or "Send Joining
  Letter" again because those actions have already been completed.
- Instead, the page should focus on batch operations: batch information, joining summary,
  training summary, trainee list, export option, training result upload, and batch
  activity/history.

## Trainee List Export

- The trainee table should be improved with proper search, filters, and export functionality.
- The exported Excel file is extremely important because HR uses it to prepare the training
  result upload. It must contain at least:
  - Employee ID
  - Trainee ID
  - Candidate Name
  - Email
  - Batch Name
  - Training Program
  - Joining Status
  - Training Status
- Currently, the training result upload requires a Trainee ID, but HR has no way to know that
  ID without checking the database. This export should solve that problem.

## Training Result Upload

- Keep the existing workflow of Upload → Validate → Commit Valid Rows. Improve what happens
  after the results are committed.
- Example: a batch contains three trainees, two pass and one fails. When HR clicks "Complete
  Batch & Release":
  - The two successful trainees should immediately become Released and eligible for RMG
    Project Allocation.
  - The failed trainee should automatically move into LAP.
- Current problem: if a trainee later clears LAP, HR has no way to release that trainee. Fix
  this flow:
  - If a trainee successfully clears LAP, HR should have a "Release Candidate" action so the
    trainee becomes eligible for Project Allocation.
  - If the trainee fails even after LAP, HR should have a "Flag Candidate" action so the
    trainee is marked as unsuccessful and is no longer eligible for Project Allocation.

## Bulk Operations

All important HR actions should support bulk operations because batches can contain hundreds
of trainees. HR should be able to:

- Release multiple trainees together.
- Move multiple trainees into LAP.
- Release multiple LAP-cleared trainees together.
- Flag multiple failed trainees together.

Example: a batch contains 200 trainees where 180 pass and 20 move into LAP, and later 18 clear
LAP while 2 fail again — HR should be able to release the 18 trainees together and flag the
remaining 2 together instead of processing them individually.

## General Expectations

- Improve the existing implementation instead of redesigning it.
- Maintain backward compatibility, audit logs, proper transactions, and role-based
  authorization.
- Review the complete workflow and improve any business logic that may create operational
  issues in a real enterprise onboarding environment before implementing the changes.
