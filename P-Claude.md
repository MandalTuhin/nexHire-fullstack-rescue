We have already developed around 80% of the NexHire project. Before making any changes, inspect the existing frontend, backend, database, APIs, routing, business logic and UI. Do not rebuild working modules. Improve the existing implementation while keeping the current architecture consistent.

I want to make the following business changes.

================================================================================
1. STAKEHOLDERS
================================================================================

The system should have only four stakeholders.

1. Candidate
2. HR
3. RMG
4. Admin

Each stakeholder should only have access to features related to their role.

================================================================================
2. ADMIN PORTAL CHANGES
================================================================================

The current Branch module is no longer required.

Please remove the Branch concept completely.

The new hierarchy should become

City
    ↓
Block

A Block represents a physical training room.

------------------------------------------------

CITY MODULE

Admin should manage City CRUD.

Examples

Kolkata
Pune
Hyderabad
Chennai
Bangalore

Each city should contain

• City Name
• Status
• Budget
• Blocks

------------------------------------------------

BLOCK MODULE

Each city contains multiple blocks.

Example

Kolkata

Block A
Capacity 60

Block B
Capacity 60

Block C
Capacity 60

Each Block should contain

• Name
• Capacity
• Current Active Batch
• Availability
• Status

A Block should only run ONE ACTIVE TRAINING BATCH at a time.

Even if Block A has capacity 60 but only 40 trainees, the remaining 20 seats CANNOT be used by another batch because the room itself is already booked.

Please implement proper block booking logic instead of simply checking remaining capacity.

===============================================================

BUDGET MODULE

The current budget implementation needs improvement.

Instead of storing a single budget value, create a proper budget system.

Each City should have

• Total Budget
• Reserved Budget
• Used Budget
• Available Budget

Also maintain Budget Transactions.

Example

+ Budget Allocation

- Budget Reserved

- Training Cost

+ Reservation Released

+ Manual Adjustment

This should work similar to a bank passbook.

Remove Hiring Slots and Training Seats from Budget Overview because those are no longer useful KPIs.

===============================================================

TRAINING PROGRAMS

Create a Training Program Master.

Managed by Admin.

Example

Java
Angular
Python
Cloud

Each Program should contain

• Name
• Duration
• Cost Per Trainee
• Status

HR should select Training Programs while creating batches.

===============================================================

PROJECTS

Projects continue to be managed by Admin.

Each Project should contain

• Name
• Client
• Technology
• Location
• Total Vacancies
• Allocated Count

When Vacancies become zero

Project Status should automatically become

FILLED

instead of Inactive.

===============================================================

USER MANAGEMENT

Remove Lifecycle column.

Keep

• Role
• Status
• Actions

Admin should create

• HR
• RMG
• Admin

users.

Candidates will continue self-registration.

Admin should create internal users using

• Email
• Role
• Temporary Password

User should be forced to change password after first login.

Rename Deactivate button to Restrict Access.

================================================================================
3. HR PORTAL CHANGES
================================================================================

The Joining Batch page already exists.

Please improve the existing page instead of redesigning it.

------------------------------------------------

STEP 1

Joining Details

Batch Name (Mandatory)

Joining Date

Joining City

Joining City should come from Admin City Master.

------------------------------------------------

STEP 2

Training Details

Training Block

The dropdown should display only Blocks

• belonging to selected City
• currently available
• not already booked
• not overlapping with another active batch
• having enough capacity

Training Program

should come from Training Program Master.

Automatically display

• Duration
• Cost Per Trainee

Remove Trainer Assignment completely.

Trainer is not part of this product.

================================================================================
4. BLOCK BOOKING BUSINESS RULE
================================================================================

This is the most important rule.

Suppose

Block A

Capacity 60

Current Batch has only 40 trainees.

Another batch still CANNOT use Block A.

Reason

The room itself is already booked.

One Block

↓

One Active Batch

No overlapping batches.

No room sharing.

Please implement proper booking validation.

================================================================================
5. BUDGET VALIDATION
================================================================================

Example

City Budget

₹500,000

Training Cost

₹5,000

Batch Size

60

Projected Cost

₹300,000

Before HR sends Joining Letters

System should verify

Available Budget.

If Budget is insufficient

Joining Letters cannot be sent.

If Budget is sufficient

Reserve the Projected Budget.

Do NOT deduct budget yet.

Later

Suppose

60 Joining Letters sent

Only 50 candidates actually join.

Actual Cost

50 × ₹5,000

₹250,000

Convert

Reserved Budget

↓

Used Budget

Release the remaining reservation automatically.

================================================================================
6. TRAINING MODULE
================================================================================

Keep the existing implementation.

Improve it.

Maintain

• Training Complete
• LAP Initiated
• Completed After LAP
• Forward To HR

Keep complete history.

Do not remove LAP history.

Maintain audit logs.

================================================================================
7. TRAINING RULES
================================================================================

After Training Start Date

HR should NOT

• Add new trainees
• Remove trainees

unless it is an administrative correction.

Training should remain fixed after it starts.

================================================================================
8. RMG PORTAL
================================================================================

RMG only works after Training Completion.

RMG should see Released Candidates.

Improve the Project Allocation page.

Support

• Search
• Filters
• Multi Select
• Bulk Allocation

Always validate remaining vacancies.

Never allow allocation beyond project capacity.

After Project Allocation

Candidate Portal should display

• Project Name
• Technology
• Location
• Allocation Date
• Current Project Status

================================================================================
9. DASHBOARDS
================================================================================

Simplify every dashboard.

Do not show unnecessary cards.

No fake data.

Everything should come from the database.

------------------------------------------------

ADMIN DASHBOARD

Show only important KPIs

• Active Users
• Cities
• Blocks
• Budget Utilization
• Active Projects
• Running Batches

------------------------------------------------

HR DASHBOARD

• Upcoming Joining
• Active Training
• LAP Cases
• Released Candidates
• Budget Alerts

------------------------------------------------

RMG DASHBOARD

• Released Candidates Waiting
• Active Projects
• Remaining Vacancies
• Recent Allocations

------------------------------------------------

CANDIDATE DASHBOARD

• Application Status
• Joining Details
• Training Status
• Project Allocation

================================================================================
10. CHANGE PASSWORD
================================================================================

Every Portal

Candidate

HR

RMG

Admin

should have a fully working Change Password page.

Fields

• Current Password
• New Password
• Confirm Password

Backend should validate

• Current Password
• Password Strength
• Password Match

================================================================================
11. GENERAL EXPECTATIONS
================================================================================

Please improve the current implementation instead of rebuilding it.

Reuse existing architecture wherever possible.

Maintain proper backend validation.

Maintain proper database relationships.

Avoid hardcoded dropdowns.

Everything should come from Master Data.

Maintain audit logs.

Maintain transactions.

Maintain role-based authorization.

The final product should look and behave like a real enterprise onboarding platform used by large organizations.

================================================================================
12. BEFORE STARTING DEVELOPMENT
================================================================================

Before writing code,

inspect the existing project and provide

1. Current Architecture Review

2. Gap Analysis

3. Database Changes

4. Entity Changes

5. API Changes

6. Frontend Changes

7. Backend Changes

8. Migration Strategy

9. Implementation Plan

Then implement the changes module by module without breaking existing functionality.

If you find any business rule that could cause future scalability or data integrity issues, explain the issue first and propose a better enterprise solution before implementing it. Do not make architectural decisions silently.


Also use pagination properly when you are displaying more data on frontend, because the loader takes forever to load in some pages where the entire 5000 candidate details are fetched. you can use something like pagination or infinite scroll. 
