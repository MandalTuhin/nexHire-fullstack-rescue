package com.nexhire.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Keeps PostgreSQL lifecycle CHECK constraints aligned with Java enums on existing databases. */
@Slf4j
@Component
@RequiredArgsConstructor
public class StatusConstraintMigration implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        jdbcTemplate.execute("ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL");
        jdbcTemplate.execute("ALTER TABLE job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check");
        jdbcTemplate.execute("""
                ALTER TABLE job_applications ADD CONSTRAINT job_applications_status_check CHECK (status IN (
                    'APPLIED', 'ASSESSMENT_ASSIGNED', 'ASSESSMENT_SCORE_UPLOADED', 'ASSESSMENT_PASSED',
                    'ASSESSMENT_FAILED', 'OFFER_GENERATED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'OFFER_REJECTED',
                    'BGC_INITIATED', 'BGC_DOCUMENTS_PENDING', 'BGC_DOCUMENTS_SUBMITTED',
                    'BGC_VERIFICATION_IN_PROGRESS', 'BGC_CLEARED', 'BGC_FAILED', 'EMPLOYEE_CREATED',
                    'SELECTED_USER_CREATED', 'JOINING_BATCH_ASSIGNED', 'JOINING_LETTER_GENERATED',
                    'JOINING_LETTER_SENT', 'JOINING_ON_HOLD', 'JOINING_ACCEPTED', 'JOINING_REJECTED',
                    'JOINING_EXPIRED', 'TRAINING_ASSIGNED', 'TRAINING_IN_PROGRESS',
                    'TRAINING_RESULT_UPLOADED', 'TRAINING_COMPLETED', 'LAP', 'TRAINING_FAILED',
                    'COMPLETED_WITH_EXCEPTIONS', 'RELEASED', 'PROJECT_ASSIGNED', 'ONBOARDED'
                ))
                """);

        jdbcTemplate.execute("ALTER TABLE joining_batches DROP CONSTRAINT IF EXISTS joining_batches_status_check");
        jdbcTemplate.execute("""
                ALTER TABLE joining_batches ADD CONSTRAINT joining_batches_status_check CHECK (status IN (
                    'CREATED', 'JOINING_LETTER_SENT', 'JOINING_ACCEPTANCE_IN_PROGRESS',
                    'READY_FOR_TRAINING', 'TRAINING_IN_PROGRESS', 'COMPLETED',
                    'COMPLETED_WITH_EXCEPTIONS', 'RELEASE_PENDING_LAP', 'CLOSED', 'CANCELLED'
                ))
                """);
        log.info("Joining/training lifecycle status constraints are up to date");
    }
}
