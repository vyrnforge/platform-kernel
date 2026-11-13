package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.idempotency.IdempotencyDecisionType;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyRequest;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InMemoryIdempotencyPortTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");

    @Test
    void acquireInProgressCompleteReplayAndConflictAreDistinct() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T09:00:00Z"));
        var ids = new SequentialUuidV7Supplier();
        var port = new InMemoryIdempotencyPort<String>(clock, ids::next);

        IdempotencyRequest request = request(TENANT_A, "asset.create", "key-1", "fingerprint-a", clock);

        var acquired = port.begin(request);
        assertEquals(IdempotencyDecisionType.ACQUIRED, acquired.type());

        var inProgress = port.begin(request);
        assertEquals(IdempotencyDecisionType.IN_PROGRESS, inProgress.type());

        var conflict = port.begin(request(TENANT_A, "asset.create", "key-1", "fingerprint-b", clock));
        assertEquals(IdempotencyDecisionType.CONFLICT, conflict.type());

        port.complete(acquired.lease(), "asset-123");

        var replay = port.begin(request);
        assertEquals(IdempotencyDecisionType.REPLAY, replay.type());
        assertEquals("asset-123", replay.replay().result());
    }

    @Test
    void sameClientKeyIsIndependentAcrossTenantAndOperation() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T09:00:00Z"));
        var port = new InMemoryIdempotencyPort<String>(clock, new SequentialUuidV7Supplier()::next);

        var a = port.begin(request(TENANT_A, "asset.create", "same-key", "fp", clock));
        var b = port.begin(request(TENANT_B, "asset.create", "same-key", "fp", clock));
        var c = port.begin(request(TENANT_A, "asset.assign", "same-key", "fp", clock));

        assertEquals(IdempotencyDecisionType.ACQUIRED, a.type());
        assertEquals(IdempotencyDecisionType.ACQUIRED, b.type());
        assertEquals(IdempotencyDecisionType.ACQUIRED, c.type());
        assertNotEquals(a.lease().leaseId(), b.lease().leaseId());
        assertNotEquals(a.lease().leaseId(), c.lease().leaseId());
    }

    @Test
    void abortReleasesKeyForRetry() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T09:00:00Z"));
        var port = new InMemoryIdempotencyPort<String>(clock, new SequentialUuidV7Supplier()::next);
        IdempotencyRequest request = request(TENANT_A, "asset.create", "key-1", "fp", clock);

        var first = port.begin(request);
        port.abort(first.lease());

        var second = port.begin(request);
        assertEquals(IdempotencyDecisionType.ACQUIRED, second.type());
        assertNotEquals(first.lease().leaseId(), second.lease().leaseId());
    }

    @Test
    void expiredRecordCanBeReacquired() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T09:00:00Z"));
        var port = new InMemoryIdempotencyPort<String>(clock, new SequentialUuidV7Supplier()::next);
        IdempotencyRequest firstRequest = new IdempotencyRequest(
                TENANT_A,
                "asset.create",
                "key-1",
                "fp-a",
                clock.instant().plusSeconds(30));

        var first = port.begin(firstRequest);
        clock.advance(Duration.ofSeconds(31));

        IdempotencyRequest secondRequest = new IdempotencyRequest(
                TENANT_A,
                "asset.create",
                "key-1",
                "fp-b",
                clock.instant().plusSeconds(30));

        var second = port.begin(secondRequest);

        assertEquals(IdempotencyDecisionType.ACQUIRED, first.type());
        assertEquals(IdempotencyDecisionType.ACQUIRED, second.type());
        assertNotEquals(first.lease().leaseId(), second.lease().leaseId());
    }

    @Test
    void expiredLeaseCannotComplete() {
        MutableClock clock = new MutableClock(Instant.parse("2026-11-13T09:00:00Z"));
        var port = new InMemoryIdempotencyPort<String>(clock, new SequentialUuidV7Supplier()::next);
        var acquired = port.begin(new IdempotencyRequest(
                TENANT_A,
                "asset.create",
                "key-1",
                "fp",
                clock.instant().plusSeconds(5)));

        clock.advance(Duration.ofSeconds(6));

        assertThrows(IllegalStateException.class, () -> port.complete(acquired.lease(), "late"));
    }

    private IdempotencyRequest request(
            UUID tenantId,
            String operation,
            String key,
            String fingerprint,
            Clock clock) {
        return new IdempotencyRequest(
                tenantId,
                operation,
                key,
                fingerprint,
                clock.instant().plusSeconds(300));
    }

    private static final class SequentialUuidV7Supplier {
        private final AtomicInteger sequence = new AtomicInteger();

        private UUID next() {
            int value = sequence.incrementAndGet();
            return UUID.fromString("019a7f0e-9234-7abc-8def-%012x".formatted(value));
        }
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            if (!ZoneOffset.UTC.equals(zone)) {
                throw new IllegalArgumentException("test clock supports UTC only");
            }
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
