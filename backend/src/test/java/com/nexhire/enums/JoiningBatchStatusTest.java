package com.nexhire.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class JoiningBatchStatusTest {

    @Test
    void readsLegacyCompletedWithExceptionsRows() {
        assertEquals(
                JoiningBatchStatus.COMPLETED_WITH_EXCEPTIONS,
                JoiningBatchStatus.valueOf("COMPLETED_WITH_EXCEPTIONS"));
    }
}
