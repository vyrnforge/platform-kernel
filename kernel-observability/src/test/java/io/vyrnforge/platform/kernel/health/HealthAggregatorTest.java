package io.vyrnforge.platform.kernel.health;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HealthAggregatorTest {
    private static final Clock CLOCK =
            Clock.fixed(Instant.parse("2026-11-13T09:00:00Z"), ZoneOffset.UTC);

    @Test
    void livenessAndReadinessAreIndependent() {
        HealthAggregator health = new HealthAggregator(
                CLOCK,
                List.of(
                        HealthProbe.liveness("self", ProbeResult::up),
                        HealthProbe.readiness("file-storage", () -> ProbeResult.down("DEPENDENCY_UNAVAILABLE"))));

        HealthSnapshot liveness = health.check(ProbeType.LIVENESS);
        HealthSnapshot readiness = health.check(ProbeType.READINESS);

        assertTrue(liveness.healthy());
        assertEquals(ProbeStatus.UP, liveness.status());
        assertFalse(readiness.healthy());
        assertEquals(ProbeStatus.DOWN, readiness.status());
    }

    @Test
    void probeExceptionsAreSanitized() {
        HealthAggregator health = new HealthAggregator(
                CLOCK,
                List.of(HealthProbe.readiness("database", () -> {
                    throw new IllegalStateException("password=do-not-leak");
                })));

        HealthSnapshot readiness = health.check(ProbeType.READINESS);

        assertEquals(ProbeStatus.DOWN, readiness.status());
        assertEquals("PROBE_EXCEPTION", readiness.components().get("database").code());
        assertFalse(readiness.components().toString().contains("do-not-leak"));
    }

    @Test
    void noRegisteredProbeForTypeIsHealthy() {
        HealthAggregator health = new HealthAggregator(CLOCK, List.of());

        assertTrue(health.check(ProbeType.LIVENESS).healthy());
        assertTrue(health.check(ProbeType.READINESS).healthy());
    }
}
