# nexHIRE

Full-stack Human Resource Management System focused on employee onboarding workflow — from candidate registration through job application, assessment, offer management, joining, training, and project allocation.

## Tech Stack

- **Backend:** Spring Boot 3.2 (Java 17), Maven, PostgreSQL, JWT authentication
- **Frontend:** Angular 19 (CLI 19.2.27), TypeScript 5.7, SCSS
- **Database:** PostgreSQL 15+

## Required Versions

| Tool        | Version |
| ----------- | ------- |
| Angular CLI | 19.2.27 |
| Angular     | 19.x    |
| Node.js     | 22.9.0  |
| npm         | 10.8.3  |
| Java        | 17+     |
| Maven       | 3.8+    |
| PostgreSQL  | 15+     |

## Project Structure

```
├── backend/          # Spring Boot REST API
│   ├── src/main/java/com/nexhire/
│   │   ├── config/       # Security, CORS configuration
│   │   ├── controller/   # REST controllers
│   │   ├── dto/          # Request/Response DTOs
│   │   ├── entity/       # JPA entities (City, Block, JoiningBatch, Trainee, ...)
│   │   ├── enums/        # UserRole, ApplicationStatus, CityStatus, ...
│   │   ├── exception/    # Custom exceptions + global handler
│   │   ├── repository/   # Spring Data JPA repositories
│   │   ├── security/     # JWT token provider + filter
│   │   ├── seed/         # Database seeder (runs once, on an empty DB)
│   │   └── service/      # Business logic services
│   └── src/main/resources/
│       └── application.yml
├── frontend/         # Angular SPA
│   └── src/app/
│       ├── core/         # Guards, interceptors, auth services
│       ├── modules/      # Feature modules (auth, candidate, hr, rmg, admin, ...)
│       ├── layouts/      # Per-portal shell layouts (candidate/hr/rmg/admin)
│       └── shared/       # Shared components, pipes, services
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:MandalTuhin/nexHire-fullstack-rescue.git
# or, over HTTPS:
# git clone https://github.com/MandalTuhin/nexHire-fullstack-rescue.git

cd nexHire-fullstack-rescue
```

### 2. Prerequisites

Install these before continuing:

- Java 17+
- Maven 3.8+
- Node.js 22.9.0
- npm 10.8.3
- Angular CLI 19.2.27 (`npm install -g @angular/cli@19.2.27`)
- PostgreSQL 15+ (running locally, listening on port 5432)

### 3. Database setup

Create the database and the `dev` schema the app reads/writes from (see `backend/src/main/resources/application.yml`):

```bash
psql -U postgres -c "CREATE DATABASE nexhire;"
psql -U postgres -d nexhire -c "CREATE SCHEMA IF NOT EXISTS dev;"
```

Default connection details (edit `application.yml` if yours differ):

- Host: `localhost:5432`
- Database: `nexhire`
- Schema: `dev`
- Username: `postgres`
- Password: `postgres`

Tables are created automatically on first backend startup (`spring.jpa.hibernate.ddl-auto: update`) — no manual migration step needed for a fresh database.

### 4. Run the backend

```bash
cd backend
mvn spring-boot:run
```

The API starts at `http://localhost:8080`. On first run against an empty database, `DataSeeder` populates a full sample dataset (staff accounts, cities/blocks, jobs, ~5000 candidates spread across the pipeline). Subsequent restarts skip seeding automatically.

### 5. Run the frontend

In a separate terminal:

```bash
cd frontend
npm install
ng serve
```

The app runs at `http://localhost:4200` and calls the backend on port 8080.

## Sample Users (seeded on first run)

| Role      | Email                  | Password    |
| --------- | ----------------------- | ----------- |
| Admin     | admin@nexhire.com      | admin123    |
| HR        | hr@nexhire.com         | hr123       |
| RMG       | rmg@nexhire.com        | rmg123      |
| Candidate | candidate1@nexhire.com | password123 |
| Candidate | candidate2@nexhire.com | password123 |

All other seeded candidate/trainee accounts (`candidate3@nexhire.com` ... `trainee1@nexhire.com`, `employee1@nexhire.com`, and the ~5000 bulk-seeded `bulkcandNNN@nexhire.com` rows) also use the password `password123`.

## Roles & Dashboards

Exactly 4 stakeholder portals, each showing only role-relevant features:

- **Candidate** (`/candidate`): Apply for jobs, track application/assessment status, accept offers and joining letters, track training and project allocation.
- **HR** (`/hr`): Manage applications, assessments, offers, joining batches (City/Block/Training Program wizard), training and LAP tracking, budget overview.
- **RMG** (`/rmg`): View released (training-complete) candidates, search/filter/bulk-allocate them to projects with vacancy validation.
- **Admin** (`/admin`): Manage Cities/Blocks, Training Programs, Projects, Users (create HR/RMG/Admin accounts), and view live system-wide dashboards.

Every portal has a working Change Password page, and Admin-created internal users must set their own password on first login.

## Demo Flow

1. Candidate registers → completes profile → applies for the hiring drive.
2. HR runs the assessment (Excel upload) → qualifying candidates get an offer letter.
3. Candidate accepts the offer → HR initiates background verification.
4. Once cleared, HR creates a Joining Batch (City → Block → Training Program, budget-checked) and sends joining letters → candidate accepts → becomes a Trainee.
5. HR assigns the batch to training (charges the City's budget passbook) and tracks progress/LAP → releases trainees on completion.
6. RMG allocates released candidates to a Project (vacancy-checked) → candidate's dashboard shows their project allocation.
