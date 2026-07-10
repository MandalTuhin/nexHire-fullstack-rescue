package com.nexhire.seed;

import com.nexhire.entity.*;
import com.nexhire.enums.ApplicationStatus;
import com.nexhire.enums.BgvStatus;
import com.nexhire.enums.LifecycleStatus;
import com.nexhire.enums.TraineeFinalResult;
import com.nexhire.enums.UserRole;
import com.nexhire.repository.*;
import com.nexhire.service.EmployeeSelectionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Seeds the database with a full end-to-end sample dataset so every screen in
 * the app has data to work with: users of each role, applications spanning
 * every {@link ApplicationStatus}, assessments, offers, joining letters, BGV
 * records, trainees at varying progress, a project allocation, asset
 * assignments and activity logs.
 *
 * Runs only when the DB is empty (users table). To reseed, drop/recreate the
 * `nexhire` database and restart the backend.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private static final String EMP_PASSWORD = "password123";

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final JobRepository jobRepository;
    private final HiringBudgetRepository hiringBudgetRepository;
    private final TrainingSeatRepository trainingSeatRepository;
    private final ProjectRepository projectRepository;
    private final AssetRepository assetRepository;
    private final JobApplicationRepository applicationRepository;
    private final AssessmentResultRepository assessmentResultRepository;
    private final OfferLetterRepository offerLetterRepository;
    private final JoiningLetterRepository joiningLetterRepository;
    private final BackgroundVerificationRepository bgvRepository;
    private final TraineeRepository traineeRepository;
    private final TrainingRecordRepository trainingRecordRepository;
    private final ProjectAssignmentRepository projectAssignmentRepository;
    private final AssetAssignmentRepository assetAssignmentRepository;
    private final ActivityLogRepository activityLogRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final EmployeeSelectionService employeeSelectionService;
    private final PasswordEncoder passwordEncoder;

    private final LocalDateTime now = LocalDateTime.now();

    /** Set once in run() before bulk-seeding — see seedBulkCandidates()'s doc comment. */
    private String bulkPasswordHash;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded, skipping.");
            return;
        }

        log.info("Seeding database with full lifecycle sample data...");

        // ─── Staff users ────────────────────────────────────────────────────────
        User admin = userRepository.save(User.builder()
                .name("Admin User").email("admin@nexhire.com")
                .password(passwordEncoder.encode("admin123")).phone("9000000001")
                .role(UserRole.ADMIN).build());

        User hr = userRepository.save(User.builder()
                .name("HR Manager").email("hr@nexhire.com")
                .password(passwordEncoder.encode("hr123")).phone("9000000002")
                .role(UserRole.HR).build());

        User rmg = userRepository.save(User.builder()
                .name("RMG Manager").email("rmg@nexhire.com")
                .password(passwordEncoder.encode("rmg123")).phone("9000000003")
                .role(UserRole.RMG).build());

        // ─── Locations + budgets + training seats ─────────────────────────────────
        Location bangalore = locationRepository.save(Location.builder()
                .name("Bangalore").city("Bangalore").build());
        Location hyderabad = locationRepository.save(Location.builder()
                .name("Hyderabad").city("Hyderabad").build());

        HiringBudget blrBudget = hiringBudgetRepository.save(HiringBudget.builder()
                .location(bangalore).totalSlots(10).usedSlots(0).budgetAmount(5000000L).usedAmount(0L).build());
        HiringBudget hydBudget = hiringBudgetRepository.save(HiringBudget.builder()
                .location(hyderabad).totalSlots(8).usedSlots(0).budgetAmount(4000000L).usedAmount(0L).build());

        TrainingSeat blrSeats = trainingSeatRepository.save(TrainingSeat.builder()
                .location(bangalore).totalSeats(15).occupiedSeats(0).build());
        TrainingSeat hydSeats = trainingSeatRepository.save(TrainingSeat.builder()
                .location(hyderabad).totalSeats(10).occupiedSeats(0).build());

        // ─── Jobs ───────────────────────────────────────────────────────────────
        // Only ONE hiring drive is ever surfaced to candidates (context.md: TCS hires in bulk
        // via a single generic drive, not per-tech-stack job postings). javaJob is that one
        // active drive; the other two stay in the DB (active=false) purely so the many
        // already-seeded/bulk-seeded applications referencing them as a FK still resolve —
        // they're simply never shown on the candidate-facing jobs list (which only queries
        // active=true jobs).
        Job javaJob = jobRepository.save(Job.builder()
                .title("TCS National Qualifier Test (NQT)")
                .description("TCS's national entry-level hiring drive for graduates across all disciplines. "
                        + "Clear the qualifier assessment to be considered for a System Engineer role.")
                .location(bangalore)
                .driveDate(LocalDate.now().plusDays(21))
                .build());

        Job angularJob = jobRepository.save(Job.builder()
                .title("Angular Developer")
                .description("Build modern web applications using Angular framework.")
                .requirements("Angular 17+, TypeScript, HTML/CSS, REST integration")
                .location(hyderabad)
                .active(false)
                .build());

        Job fullStackJob = jobRepository.save(Job.builder()
                .title("Full Stack Developer")
                .description("Work on both frontend and backend of enterprise applications.")
                .requirements("Java, Angular, PostgreSQL, Docker basics")
                .location(bangalore)
                .active(false)
                .build());

        // ─── Projects (managed by Admin) ──────────────────────────────────────────
        Project alpha = projectRepository.save(Project.builder()
                .name("HDFC Banking Portal").description("Core banking web application with transaction processing and account management").build());
        Project beta = projectRepository.save(Project.builder()
                .name("Flipkart Logistics Platform").description("Warehouse management and last-mile delivery optimization system").build());
        projectRepository.save(Project.builder()
                .name("Infosys Cloud Migration").description("Legacy on-premise workload migration to AWS cloud infrastructure").build());

        // ─── Assets ───────────────────────────────────────────────────────────────
        Asset laptop1 = assetRepository.save(asset("Dell Latitude 5540", "LAPTOP", "DL-5540-0001"));
        Asset laptop2 = assetRepository.save(asset("Dell Latitude 5540", "LAPTOP", "DL-5540-0002"));
        Asset laptop3 = assetRepository.save(asset("MacBook Pro 14", "LAPTOP", "MBP-14-0001"));
        Asset idCard1 = assetRepository.save(asset("Employee ID Card", "ID_CARD", "IDC-0001"));
        Asset idCard2 = assetRepository.save(asset("Employee ID Card", "ID_CARD", "IDC-0002"));
        assetRepository.save(asset("Logitech Headset", "HEADSET", "LG-HS-0001"));

        // ─── Candidates across every application status ───────────────────────────
        // APPLIED
        User u1 = emp("John Candidate", "candidate1@nexhire.com", "9000000101", LifecycleStatus.CANDIDATE);
        app(u1, javaJob, ApplicationStatus.APPLIED);

        // ASSESSMENT_ASSIGNED
        User u2 = emp("Jane Candidate", "candidate2@nexhire.com", "9000000102", LifecycleStatus.CANDIDATE);
        app(u2, angularJob, ApplicationStatus.ASSESSMENT_ASSIGNED);

        // ASSESSMENT_SCORE_UPLOADED (score recorded)
        User u3 = emp("Arjun Rao", "candidate3@nexhire.com", "9000000103", LifecycleStatus.CANDIDATE);
        JobApplication a3 = app(u3, javaJob, ApplicationStatus.ASSESSMENT_SCORE_UPLOADED);
        assessment(a3, 78.5, "Strong core Java, average on system design.", hr);

        // QUALIFIED (ASSESSMENT_PASSED always implies an auto-generated, not-yet-sent
        // OfferLetter — every real code path enforces this via OfferGenerationService;
        // seed data must not violate that invariant or this candidate silently never
        // appears on the Offer Letters page).
        User u4 = emp("Meera Nair", "candidate4@nexhire.com", "9000000104", LifecycleStatus.CANDIDATE);
        JobApplication a4 = app(u4, fullStackJob, ApplicationStatus.ASSESSMENT_PASSED);
        assessment(a4, 88.0, "Excellent all-round performance.", hr);
        offerLetterRepository.save(OfferLetter.builder()
                .application(a4)
                .content("Offer for Full Stack Developer at NexHire.")
                .build());

        // REJECTED
        User u5 = emp("Rohit Kumar", "candidate5@nexhire.com", "9000000105", LifecycleStatus.CANDIDATE);
        JobApplication a5 = app(u5, angularJob, ApplicationStatus.ASSESSMENT_FAILED);
        assessment(a5, 41.0, "Did not meet the qualifying threshold.", hr);

        // OFFER_SENT
        User u6 = emp("Sneha Iyer", "candidate6@nexhire.com", "9000000106", LifecycleStatus.CANDIDATE);
        JobApplication a6 = app(u6, javaJob, ApplicationStatus.OFFER_SENT);
        assessment(a6, 82.0, "Good problem solving.", hr);
        offer(a6, "Offer for Java Developer at NexHire. Annual CTC 12 LPA.", hr, null);

        // OFFER_ACCEPTED (+ BGV in progress)
        User u7 = emp("Vikram Shah", "candidate7@nexhire.com", "9000000107", LifecycleStatus.CANDIDATE);
        JobApplication a7 = app(u7, fullStackJob, ApplicationStatus.OFFER_ACCEPTED);
        assessment(a7, 90.0, "Top performer.", hr);
        offer(a7, "Offer for Full Stack Developer at NexHire. Annual CTC 14 LPA.", hr, now.minusDays(2));
        bgv(a7, BgvStatus.VERIFICATION_IN_PROGRESS, "SecureCheck Pvt Ltd", "Employment history verification underway.", null);

        // OFFER_REJECTED
        User u8 = emp("Anita Desai", "candidate8@nexhire.com", "9000000108", LifecycleStatus.CANDIDATE);
        JobApplication a8 = app(u8, angularJob, ApplicationStatus.OFFER_REJECTED);
        assessment(a8, 85.0, "Accepted another offer.", hr);
        offer(a8, "Offer for Angular Developer at NexHire.", hr, now.minusDays(1));

        // JOINING_ON_HOLD
        User u9 = emp("Karan Malhotra", "candidate9@nexhire.com", "9000000109", LifecycleStatus.CANDIDATE);
        JobApplication a9 = app(u9, javaJob, ApplicationStatus.JOINING_ON_HOLD);
        a9.setHoldReason("Awaiting hiring budget availability at Bangalore.");
        a9.setHoldCreatedAt(now.minusDays(1));
        applicationRepository.save(a9);
        assessment(a9, 80.0, "Ready to join, pending resources.", hr);
        offer(a9, "Offer for Java Developer at NexHire.", hr, now.minusDays(3));
        bgv(a9, BgvStatus.CLEARED, "SecureCheck Pvt Ltd", "All checks cleared.", now.minusDays(1));

        // JOINING_LETTER_SENT (joining letter issued, awaiting candidate acceptance)
        User u10 = emp("Divya Menon", "candidate10@nexhire.com", "9000000110", LifecycleStatus.CANDIDATE);
        JobApplication a10 = app(u10, fullStackJob, ApplicationStatus.JOINING_LETTER_SENT);
        assessment(a10, 87.0, "Cleared all rounds.", hr);
        offer(a10, "Offer for Full Stack Developer at NexHire.", hr, now.minusDays(4));
        bgv(a10, BgvStatus.CLEARED, "SecureCheck Pvt Ltd", "All checks cleared.", now.minusDays(2));
        joining(a10, bangalore, hr, LocalDate.now().plusDays(7), null);

        // TRAINING_IN_PROGRESS (trainee, 45%)
        User t1 = emp("Aditya Verma", "trainee1@nexhire.com", "9000000111", LifecycleStatus.TRAINEE);
        JobApplication ta1 = app(t1, javaJob, ApplicationStatus.TRAINING_IN_PROGRESS);
        assessment(ta1, 84.0, "Cleared all rounds.", hr);
        offer(ta1, "Offer for Java Developer at NexHire.", hr, now.minusDays(20));
        bgv(ta1, BgvStatus.CLEARED, "SecureCheck Pvt Ltd", "All checks cleared.", now.minusDays(15));
        joining(ta1, bangalore, hr, LocalDate.now().minusDays(10), now.minusDays(12));
        trainee(t1, ta1, 45, "Spring Boot Fundamentals", false, now.minusDays(10));

        // TRAINING_IN_PROGRESS (trainee, 70%)
        User t2 = emp("Pooja Reddy", "trainee2@nexhire.com", "9000000112", LifecycleStatus.TRAINEE);
        JobApplication ta2 = app(t2, angularJob, ApplicationStatus.TRAINING_IN_PROGRESS);
        assessment(ta2, 81.0, "Cleared all rounds.", hr);
        offer(ta2, "Offer for Angular Developer at NexHire.", hr, now.minusDays(22));
        bgv(ta2, BgvStatus.CLEARED, "VerifyPro Solutions", "All checks cleared.", now.minusDays(16));
        joining(ta2, hyderabad, hr, LocalDate.now().minusDays(11), now.minusDays(13));
        trainee(t2, ta2, 70, "Angular Components & RxJS", false, now.minusDays(11));

        // TRAINING_COMPLETED (eligible for RMG allocation)
        User t3 = emp("Sameer Joshi", "trainee3@nexhire.com", "9000000113", LifecycleStatus.TRAINEE);
        JobApplication ta3 = app(t3, javaJob, ApplicationStatus.TRAINING_COMPLETED);
        assessment(ta3, 89.0, "Cleared all rounds.", hr);
        offer(ta3, "Offer for Java Developer at NexHire.", hr, now.minusDays(40));
        bgv(ta3, BgvStatus.CLEARED, "SecureCheck Pvt Ltd", "All checks cleared.", now.minusDays(35));
        joining(ta3, bangalore, hr, LocalDate.now().minusDays(30), now.minusDays(32));
        Trainee tr3 = trainee(t3, ta3, 100, "Spring Boot Microservices", true, now.minusDays(2));

        // TRAINING_COMPLETED (eligible for RMG allocation)
        User t4 = emp("Nisha Gupta", "trainee4@nexhire.com", "9000000114", LifecycleStatus.TRAINEE);
        JobApplication ta4 = app(t4, fullStackJob, ApplicationStatus.TRAINING_COMPLETED);
        assessment(ta4, 92.0, "Cleared all rounds.", hr);
        offer(ta4, "Offer for Full Stack Developer at NexHire.", hr, now.minusDays(42));
        bgv(ta4, BgvStatus.CLEARED, "VerifyPro Solutions", "All checks cleared.", now.minusDays(37));
        joining(ta4, bangalore, hr, LocalDate.now().minusDays(31), now.minusDays(33));
        trainee(t4, ta4, 100, "Full Stack Capstone", true, now.minusDays(1));

        // PROJECT_ASSIGNED (already allocated to Project Alpha by RMG)
        User t5 = emp("Rahul Singh", "employee1@nexhire.com", "9000000115", LifecycleStatus.PROJECT_ASSIGNED);
        JobApplication ta5 = app(t5, javaJob, ApplicationStatus.PROJECT_ASSIGNED);
        assessment(ta5, 86.0, "Cleared all rounds.", hr);
        offer(ta5, "Offer for Java Developer at NexHire.", hr, now.minusDays(70));
        bgv(ta5, BgvStatus.CLEARED, "SecureCheck Pvt Ltd", "All checks cleared.", now.minusDays(65));
        joining(ta5, bangalore, hr, LocalDate.now().minusDays(60), now.minusDays(62));
        Trainee tr5 = trainee(t5, ta5, 100, "Spring Boot Microservices", true, now.minusDays(50));
        assignToProject(tr5, alpha, rmg, now.minusDays(5));

        // ─── Asset assignments ────────────────────────────────────────────────────
        assignAsset(laptop1, t5, now.minusDays(50));   // active
        assignAsset(idCard1, t5, now.minusDays(50));   // active
        assignAsset(laptop2, t3, now.minusDays(30));   // active
        assignAsset(idCard2, t4, now.minusDays(31));   // active

        // ─── Bulk candidates (~5000) spread across the pipeline, for realistic scale
        // testing of pagination/filtering/dashboard counts — context.md's "around 5000 job
        // applications" / "Do not load all 5000 records at once" sizing. ───────────────────
        // Give the two locations extra headroom so the bulk far-along candidates (who do
        // consume real budget/seats, same as the named seed above) don't read as "over
        // capacity" on the Budget Overview page.
        blrBudget.setTotalSlots(20);
        hydBudget.setTotalSlots(15);
        blrSeats.setTotalSeats(25);
        hydSeats.setTotalSeats(15);
        // BCrypt is deliberately slow (~50-100ms/hash) — hash once and reuse across all ~5000
        // bulk candidates instead of re-hashing the same constant password every time.
        bulkPasswordHash = passwordEncoder.encode(EMP_PASSWORD);
        BulkSeedCounters counters = seedBulkCandidates(
                new Job[]{javaJob, angularJob, fullStackJob}, bangalore, hyderabad, hr);

        // ─── Reflect resource usage from joined people ────────────────────────────
        // 5 joined into Bangalore (t1, t3, t4, t5, u10), 1 into Hyderabad (t2), plus
        // whatever the bulk seed above pushed through training assignment.
        blrBudget.setUsedSlots(5 + counters.blrTrainingAssigned);
        blrBudget.setUsedAmount(250000L + counters.blrTrainingAssigned * 50000L);
        hydBudget.setUsedSlots(1 + counters.hydTrainingAssigned);
        hydBudget.setUsedAmount(50000L + counters.hydTrainingAssigned * 50000L);
        hiringBudgetRepository.save(blrBudget);
        hiringBudgetRepository.save(hydBudget);
        // Trainees currently occupying training seats (in-progress, not yet released): t1
        // (BLR), t2 (HYD), plus the bulk seed's still-in-progress trainees.
        blrSeats.setOccupiedSeats(3 + counters.blrSeatsOccupied);
        hydSeats.setOccupiedSeats(2 + counters.hydSeatsOccupied);
        trainingSeatRepository.save(blrSeats);
        trainingSeatRepository.save(hydSeats);

        // ─── Activity logs ────────────────────────────────────────────────────────
        activity(hr, "ASSESSMENT_SCORED", "HR recorded assessment score for Arjun Rao.", now.minusDays(6));
        activity(hr, "OFFER_SENT", "HR sent an offer letter to Sneha Iyer.", now.minusDays(5));
        activity(hr, "OFFER_ACCEPTED", "Vikram Shah accepted the offer.", now.minusDays(2));
        activity(hr, "BGV_INITIATED", "HR initiated background verification for Vikram Shah.", now.minusDays(2));
        activity(hr, "JOINING_LETTER_SENT", "HR sent a joining letter to Divya Menon.", now.minusDays(1));
        activity(hr, "TRAINING_COMPLETED", "Sameer Joshi completed training.", now.minusDays(2));
        activity(rmg, "PROJECT_ASSIGNED", "RMG allocated Rahul Singh to Project Alpha.", now.minusDays(5));
        activity(admin, "PROJECT_CREATED", "Admin created Project Gamma.", now.minusDays(3));
        activity(admin, "ASSET_ASSIGNED", "Admin assigned a laptop to Rahul Singh.", now.minusDays(50));

        log.info("Database seeding complete: {} users, {} applications.",
                userRepository.count(), applicationRepository.count());
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private Asset asset(String name, String type, String serial) {
        return Asset.builder().name(name).type(type).serialNumber(serial).build();
    }

    private User emp(String name, String email, String phone, LifecycleStatus ls) {
        return userRepository.save(User.builder()
                .name(name).email(email).password(passwordEncoder.encode(EMP_PASSWORD))
                .phone(phone).role(UserRole.EMPLOYEE).lifecycleStatus(ls).build());
    }

    private JobApplication app(User user, Job job, ApplicationStatus status) {
        return applicationRepository.save(JobApplication.builder()
                .user(user).job(job).status(status).build());
    }

    private void assessment(JobApplication application, double score, String remarks, User evaluatedBy) {
        assessmentResultRepository.save(AssessmentResult.builder()
                .application(application).score(score).remarks(remarks)
                .evaluatedBy(evaluatedBy).evaluatedAt(now.minusDays(6)).build());
    }

    private void offer(JobApplication application, String content, User sentBy, LocalDateTime respondedAt) {
        offerLetterRepository.save(OfferLetter.builder()
                .application(application).content(content).sentBy(sentBy)
                .sentAt(now.minusDays(5)).respondedAt(respondedAt).build());
    }

    private void bgv(JobApplication application, BgvStatus status, String vendor, String remarks, LocalDateTime completedAt) {
        bgvRepository.save(BackgroundVerification.builder()
                .application(application).status(status).vendorName(vendor)
                .remarks(remarks).completedAt(completedAt).build());
    }

    private void joining(JobApplication application, Location location, User sentBy, LocalDate joiningDate, LocalDateTime respondedAt) {
        joiningLetterRepository.save(JoiningLetter.builder()
                .application(application)
                .content("Joining letter for " + application.getJob().getTitle() + " at NexHire.")
                .joiningDate(joiningDate).location(location).sentBy(sentBy)
                .sentAt(now.minusDays(12)).respondedAt(respondedAt).build());
    }

    private Trainee trainee(User user, JobApplication application, int progress, String topic, boolean completed, LocalDateTime updatedAt) {
        Trainee trainee = traineeRepository.save(Trainee.builder()
                .user(user).application(application).joinedAt(now.minusDays(12)).build());
        trainingRecordRepository.save(TrainingRecord.builder()
                .trainee(trainee).progress(progress).topic(topic).completed(completed).build());
        return trainee;
    }

    private void assignToProject(Trainee trainee, Project project, User assignedBy, LocalDateTime assignedAt) {
        projectAssignmentRepository.save(ProjectAssignment.builder()
                .trainee(trainee).project(project).assignedBy(assignedBy).assignedAt(assignedAt).build());
        project.setTeamSize(project.getTeamSize() + 1);
        projectRepository.save(project);
    }

    private void assignAsset(Asset asset, User user, LocalDateTime assignedAt) {
        assetAssignmentRepository.save(AssetAssignment.builder()
                .asset(asset).user(user).assignedAt(assignedAt).active(true).build());
    }

    private void activity(User user, String actionType, String description, LocalDateTime timestamp) {
        activityLogRepository.save(ActivityLog.builder()
                .user(user).actionType(actionType).description(description).timestamp(timestamp).build());
    }

    // ─── Bulk candidate seeding (~5000 rows) ─────────────────────────────────────

    private static final String[] FIRST_NAMES = {
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
            "Ananya", "Diya", "Saanvi", "Aadhya", "Kavya", "Myra", "Aarohi", "Anika", "Riya", "Pari",
            "Rohan", "Karan", "Nikhil", "Varun", "Siddharth", "Rahul", "Amit", "Suresh", "Vikas", "Manish",
            "Priya", "Neha", "Pooja", "Sneha", "Kritika", "Shreya", "Divya", "Meera", "Anjali", "Swati",
    };
    private static final String[] LAST_NAMES = {
            "Sharma", "Verma", "Gupta", "Iyer", "Nair", "Rao", "Reddy", "Menon", "Patel", "Singh",
            "Kumar", "Malhotra", "Chopra", "Desai", "Joshi", "Kapoor", "Bhatt", "Mehta", "Pillai", "Shah",
    };

    private String bulkName(int i) {
        return FIRST_NAMES[i % FIRST_NAMES.length] + " " + LAST_NAMES[i % LAST_NAMES.length];
    }

    /** Aggregate counts the caller needs to correctly reflect budget/seat consumption. */
    private record BulkSeedCounters(int blrTrainingAssigned, int hydTrainingAssigned,
                                     int blrSeatsOccupied, int hydSeatsOccupied) {}

    /**
     * Seeds ~5000 candidates spread across every pipeline stage in a realistic funnel shape
     * (most sit early — applied/in-assessment — tapering sharply toward release), so the
     * Applications page's server-side pagination/search/filter and the HR Dashboard's counts
     * have real scale to work against. Mirrors context.md's "around 5000 job applications" /
     * "Do not load all 5000 records at once" sizing.
     *
     * Uses lightweight direct entity construction (not the full service-layer pipeline —
     * PDF/file generation for 5000 offer/joining letters would make startup impractically
     * slow) except for the BGC-cleared cascade, which reuses EmployeeSelectionService so
     * Employee/SelectedUser creation stays consistent with the one real business rule.
     */
    private BulkSeedCounters seedBulkCandidates(Job[] jobs, Location bangalore, Location hyderabad, User hr) {
        int i = 0;
        int blrTrainingAssigned = 0, hydTrainingAssigned = 0, blrSeatsOccupied = 0, hydSeatsOccupied = 0;

        i = bulkStage(i, 2000, jobs, hr, ApplicationStatus.APPLIED, false);
        i = bulkStage(i, 1000, jobs, hr, ApplicationStatus.ASSESSMENT_ASSIGNED, false);
        i = bulkStage(i, 400, jobs, hr, ApplicationStatus.ASSESSMENT_SCORE_UPLOADED, true);
        i = bulkStage(i, 600, jobs, hr, ApplicationStatus.ASSESSMENT_FAILED, true);
        i = bulkOfferStage(i, 300, jobs, hr, false, null);              // OFFER_GENERATED
        i = bulkOfferStage(i, 250, jobs, hr, true, null);               // OFFER_SENT
        i = bulkOfferAcceptedStage(i, 190, jobs, hr, BgvStatus.DOCUMENTS_PENDING); // OFFER_ACCEPTED (+BGC started)
        i = bulkOfferStage(i, 50, jobs, hr, true, now.minusDays(2));    // OFFER_REJECTED
        i = bulkOfferAcceptedStage(i, 80, jobs, hr, BgvStatus.VERIFICATION_IN_PROGRESS); // BGC in progress
        i = bulkSelectedStage(i, 60, jobs, hr);                        // SELECTED_USER_CREATED (BGC cleared)
        i = bulkOfferAcceptedStage(i, 20, jobs, hr, BgvStatus.FAILED); // BGC_FAILED
        i = bulkJoiningStage(i, 25, jobs, bangalore, hyderabad, hr, false); // JOINING_LETTER_SENT
        i = bulkJoiningStage(i, 15, jobs, bangalore, hyderabad, hr, true); // JOINING_ACCEPTED

        // TRAINING_IN_PROGRESS / RELEASED — Bangalore only, small counts, do consume real
        // budget + (for in-progress) training seats.
        for (int n = 0; n < 5; n++, i++) {
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], ApplicationStatus.TRAINING_IN_PROGRESS, hr);
            traineeRepository.save(Trainee.builder()
                    .user(app.getUser()).application(app).joinedAt(now.minusDays(5))
                    .score(null).finalResult(TraineeFinalResult.PENDING).build());
            blrTrainingAssigned++;
            blrSeatsOccupied++;
        }
        for (int n = 0; n < 5; n++, i++) {
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], ApplicationStatus.RELEASED, hr);
            traineeRepository.save(Trainee.builder()
                    .user(app.getUser()).application(app).joinedAt(now.minusDays(20))
                    .score(88.0).attendancePercentage(92.0)
                    .finalResult(TraineeFinalResult.PASSED).released(true).build());
            blrTrainingAssigned++;
        }

        log.info("Bulk-seeded {} candidates across the full pipeline.", i);
        return new BulkSeedCounters(blrTrainingAssigned, hydTrainingAssigned, blrSeatsOccupied, hydSeatsOccupied);
    }

    /** Builds `count` candidates with a plain application at `status`, optionally with a score. */
    private int bulkStage(int startIndex, int count, Job[] jobs, User hr, ApplicationStatus status, boolean withScore) {
        int i = startIndex;
        for (int n = 0; n < count; n++, i++) {
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], status, hr);
            if (withScore) {
                double score = status == ApplicationStatus.ASSESSMENT_FAILED ? 35 + (i % 15) : 60 + (i % 25);
                assessmentResultRepository.save(AssessmentResult.builder()
                        .application(app).score(score).evaluatedBy(hr).evaluatedAt(now.minusDays(3)).build());
            }
        }
        return i;
    }

    /** Builds `count` candidates who passed assessment and have an OfferLetter, optionally sent/responded. */
    private int bulkOfferStage(int startIndex, int count, Job[] jobs, User hr, boolean sent, LocalDateTime respondedAt) {
        int i = startIndex;
        ApplicationStatus status = respondedAt != null ? ApplicationStatus.OFFER_REJECTED
                : sent ? ApplicationStatus.OFFER_SENT : ApplicationStatus.OFFER_GENERATED;
        for (int n = 0; n < count; n++, i++) {
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], status, hr);
            assessmentResultRepository.save(AssessmentResult.builder()
                    .application(app).score(70.0 + (i % 20)).evaluatedBy(hr).evaluatedAt(now.minusDays(6)).build());
            offerLetterRepository.save(OfferLetter.builder()
                    .application(app).content("Offer for " + app.getJob().getTitle() + " at NexHire.")
                    .sentBy(sent || respondedAt != null ? hr : null)
                    .sentAt(sent || respondedAt != null ? now.minusDays(4) : null)
                    .respondedAt(respondedAt).build());
        }
        return i;
    }

    /** Builds `count` candidates who accepted their offer and have a BGC case at `bgcStatus`. */
    private int bulkOfferAcceptedStage(int startIndex, int count, Job[] jobs, User hr, BgvStatus bgcStatus) {
        int i = startIndex;
        ApplicationStatus appStatus = switch (bgcStatus) {
            case DOCUMENTS_PENDING -> ApplicationStatus.OFFER_ACCEPTED;
            case VERIFICATION_IN_PROGRESS -> ApplicationStatus.BGC_VERIFICATION_IN_PROGRESS;
            case FAILED -> ApplicationStatus.BGC_FAILED;
            default -> ApplicationStatus.OFFER_ACCEPTED;
        };
        for (int n = 0; n < count; n++, i++) {
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], appStatus, hr);
            assessmentResultRepository.save(AssessmentResult.builder()
                    .application(app).score(75.0 + (i % 15)).evaluatedBy(hr).evaluatedAt(now.minusDays(10)).build());
            offerLetterRepository.save(OfferLetter.builder()
                    .application(app).content("Offer for " + app.getJob().getTitle() + " at NexHire.")
                    .sentBy(hr).sentAt(now.minusDays(9)).respondedAt(now.minusDays(8)).build());
            bgvRepository.save(BackgroundVerification.builder()
                    .application(app).status(bgcStatus).vendorName("SecureCheck Pvt Ltd")
                    .completedAt(bgcStatus == BgvStatus.FAILED ? now.minusDays(1) : null).build());
        }
        return i;
    }

    /** Builds `count` candidates whose BGC cleared -> Employee + SelectedUser created. */
    private int bulkSelectedStage(int startIndex, int count, Job[] jobs, User hr) {
        int i = startIndex;
        for (int n = 0; n < count; n++, i++) {
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], ApplicationStatus.BGC_CLEARED, hr);
            assessmentResultRepository.save(AssessmentResult.builder()
                    .application(app).score(80.0 + (i % 15)).evaluatedBy(hr).evaluatedAt(now.minusDays(15)).build());
            offerLetterRepository.save(OfferLetter.builder()
                    .application(app).content("Offer for " + app.getJob().getTitle() + " at NexHire.")
                    .sentBy(hr).sentAt(now.minusDays(14)).respondedAt(now.minusDays(13)).build());
            bgvRepository.save(BackgroundVerification.builder()
                    .application(app).status(BgvStatus.CLEARED).vendorName("SecureCheck Pvt Ltd")
                    .completedAt(now.minusDays(5)).build());
            employeeSelectionService.createIfAbsent(app);
        }
        return i;
    }

    /** Builds `count` selected candidates with a joining letter, either accepted or just sent. */
    private int bulkJoiningStage(int startIndex, int count, Job[] jobs, Location bangalore, Location hyderabad,
                                  User hr, boolean accepted) {
        int i = startIndex;
        for (int n = 0; n < count; n++, i++) {
            Location loc = i % 2 == 0 ? bangalore : hyderabad;
            ApplicationStatus status = accepted ? ApplicationStatus.JOINING_ACCEPTED : ApplicationStatus.JOINING_LETTER_SENT;
            JobApplication app = bulkApplication(i, jobs[i % jobs.length], status, hr);
            assessmentResultRepository.save(AssessmentResult.builder()
                    .application(app).score(80.0 + (i % 15)).evaluatedBy(hr).evaluatedAt(now.minusDays(20)).build());
            offerLetterRepository.save(OfferLetter.builder()
                    .application(app).content("Offer for " + app.getJob().getTitle() + " at NexHire.")
                    .sentBy(hr).sentAt(now.minusDays(19)).respondedAt(now.minusDays(18)).build());
            bgvRepository.save(BackgroundVerification.builder()
                    .application(app).status(BgvStatus.CLEARED).vendorName("SecureCheck Pvt Ltd")
                    .completedAt(now.minusDays(12)).build());
            employeeSelectionService.createIfAbsent(app);
            app.setStatus(status);
            applicationRepository.save(app);
            joiningLetterRepository.save(JoiningLetter.builder()
                    .application(app).content("Joining letter for " + app.getJob().getTitle() + " at NexHire.")
                    .joiningDate(LocalDate.now().plusDays(7)).location(loc).sentBy(hr)
                    .sentAt(now.minusDays(6)).respondedAt(accepted ? now.minusDays(5) : null).build());
        }
        return i;
    }

    /** Candidate user + profile + application at the given status — the common base every
     *  bulk-stage helper builds on top of. */
    private JobApplication bulkApplication(int i, Job job, ApplicationStatus status, User hr) {
        User user = userRepository.save(User.builder()
                .name(bulkName(i)).email("bulkcand" + i + "@nexhire.com")
                .password(bulkPasswordHash)
                .phone("70" + String.format("%08d", i))
                .role(UserRole.EMPLOYEE).lifecycleStatus(LifecycleStatus.CANDIDATE).build());

        candidateProfileRepository.save(CandidateProfile.builder()
                .user(user)
                .graduationDegree(i % 3 == 0 ? "B.Tech" : i % 3 == 1 ? "B.E." : "M.Tech")
                .graduationCgpa(6.5 + (i % 35) / 10.0)
                .graduationPassingYear(2020 + (i % 5))
                .primarySkills("Java, Spring Boot")
                .profileCompleted(i % 10 != 0) // ~90% completed, ~10% incomplete
                .completedAt(i % 10 != 0 ? now.minusDays(15) : null)
                .build());

        // appliedAt is @CreationTimestamp — always set to insert time regardless of builder input.
        return applicationRepository.save(JobApplication.builder()
                .user(user).job(job).status(status).build());
    }
}
