package com.nexhire.seed;

import com.nexhire.entity.*;
import com.nexhire.enums.UserRole;
import com.nexhire.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Seeds only the baseline reference data an empty system needs to be usable: one Admin, one
 * HR, and one RMG account, the city/job/project/asset master data they manage, and nothing
 * else. There is deliberately no seeded candidate/application/pipeline data — real candidates
 * register themselves through the normal sign-up flow.
 *
 * Runs only when the DB is empty (users table). To reseed, drop/recreate the `nexhire`
 * database and restart the backend.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CityRepository locationRepository;
    private final JobRepository jobRepository;
    private final ProjectRepository projectRepository;
    private final AssetRepository assetRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded, skipping.");
            return;
        }

        log.info("Seeding baseline reference data...");

        // ─── Staff users ────────────────────────────────────────────────────────
        userRepository.save(User.builder()
                .name("Admin User").email("admin@nexhire.com")
                .password(passwordEncoder.encode("admin123")).phone("9000000001")
                .role(UserRole.ADMIN).build());

        userRepository.save(User.builder()
                .name("HR Manager").email("hr@nexhire.com")
                .password(passwordEncoder.encode("hr123")).phone("9000000002")
                .role(UserRole.HR).build());

        userRepository.save(User.builder()
                .name("RMG Manager").email("rmg@nexhire.com")
                .password(passwordEncoder.encode("rmg123")).phone("9000000003")
                .role(UserRole.RMG).build());

        // ─── Cities ─────────────────────────────────────────────────────────────
        City bangalore = locationRepository.save(City.builder()
                .name("Bangalore").totalBudget(5000000L).build());
        locationRepository.save(City.builder()
                .name("Hyderabad").totalBudget(4000000L).build());

        // ─── Jobs ───────────────────────────────────────────────────────────────
        // Only ONE hiring drive is ever surfaced to candidates (context.md: TCS hires in bulk
        // via a single generic drive, not per-tech-stack job postings).
        jobRepository.save(Job.builder()
                .title("TCS National Qualifier Test (NQT)")
                .description("TCS's national entry-level hiring drive for graduates across all disciplines. "
                        + "Clear the qualifier assessment to be considered for a System Engineer role.")
                .location(bangalore)
                .driveDate(LocalDate.now().plusDays(21))
                .build());

        // ─── Projects (managed by Admin) ──────────────────────────────────────────
        projectRepository.save(Project.builder()
                .name("HDFC Banking Portal").description("Core banking web application with transaction processing and account management")
                .client("HDFC Bank").technology("Java, Spring Boot").location(bangalore).totalVacancies(15).build());
        projectRepository.save(Project.builder()
                .name("Flipkart Logistics Platform").description("Warehouse management and last-mile delivery optimization system")
                .client("Flipkart").technology("Angular, Node.js").location(bangalore).totalVacancies(12).build());
        projectRepository.save(Project.builder()
                .name("Infosys Cloud Migration").description("Legacy on-premise workload migration to AWS cloud infrastructure")
                .client("Infosys").technology("AWS, Python").location(bangalore).totalVacancies(10).build());

        // ─── Assets ───────────────────────────────────────────────────────────────
        assetRepository.save(asset("Dell Latitude 5540", "LAPTOP", "DL-5540-0001"));
        assetRepository.save(asset("Dell Latitude 5540", "LAPTOP", "DL-5540-0002"));
        assetRepository.save(asset("MacBook Pro 14", "LAPTOP", "MBP-14-0001"));
        assetRepository.save(asset("Employee ID Card", "ID_CARD", "IDC-0001"));
        assetRepository.save(asset("Employee ID Card", "ID_CARD", "IDC-0002"));
        assetRepository.save(asset("Logitech Headset", "HEADSET", "LG-HS-0001"));

        log.info("Database seeding complete: {} users.", userRepository.count());
    }

    private Asset asset(String name, String type, String serial) {
        return Asset.builder().name(name).type(type).serialNumber(serial).build();
    }
}
