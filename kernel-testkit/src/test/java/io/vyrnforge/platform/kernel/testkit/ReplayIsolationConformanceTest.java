package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.idempotency.*;
import io.vyrnforge.platform.kernel.pipeline.*;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Executable conformance checks for testkit replay isolation and safe application
 * composition. The in-memory adapter is not a durable or production auth system.
 */
class ReplayIsolationConformanceTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");
    private static final String ACTOR = "opaque-actor-1";
    private static final Instant START = Instant.parse("2026-11-13T09:00:00Z");

    @Test
    void ccReplaySameKeyNeverReturnsAnotherTenantsCompletedResult() {
        var clock = new MutableClock(START);
        var port = new InMemoryIdempotencyPort<String>(clock, ids());

        var a = port.begin(request(TENANT_A, "same-key", "payload-a", clock));
        var b = port.begin(request(TENANT_B, "same-key", "payload-b", clock));
        assertEquals(IdempotencyDecisionType.ACQUIRED, a.type());
        assertEquals(IdempotencyDecisionType.ACQUIRED, b.type());

        port.complete(a.lease(), "private-result-a");
        port.complete(b.lease(), "private-result-b");

        var replayA = port.begin(request(TENANT_A, "same-key", "payload-a", clock));
        var replayB = port.begin(request(TENANT_B, "same-key", "payload-b", clock));
        assertEquals(IdempotencyDecisionType.REPLAY, replayA.type());
        assertEquals(IdempotencyDecisionType.REPLAY, replayB.type());
        assertEquals("private-result-a", replayA.replay().result());
        assertEquals("private-result-b", replayB.replay().result());
        assertEquals(IdempotencyDecisionType.CONFLICT,
                port.begin(request(TENANT_A, "same-key", "payload-b", clock)).type());
        assertEquals("private-result-b",
                port.begin(request(TENANT_B, "same-key", "payload-b", clock)).replay().result());
    }

    @Test
    void ccStaleLeaseCannotOverwriteReacquiredSameKey() {
        var clock = new MutableClock(START);
        var port = new InMemoryIdempotencyPort<String>(clock, ids());
        var initial = port.begin(new IdempotencyRequest(
                TENANT_A, "asset.create", "same-key", "fp", clock.instant().plusSeconds(5)));
        assertEquals(IdempotencyDecisionType.ACQUIRED, initial.type());

        // At the exact expiration instant, the old lease is no longer current.
        clock.advance(Duration.ofSeconds(5));
        var replacement = port.begin(new IdempotencyRequest(
                TENANT_A, "asset.create", "same-key", "fp", clock.instant().plusSeconds(15)));
        assertEquals(IdempotencyDecisionType.ACQUIRED, replacement.type());
        assertNotEquals(initial.lease().leaseId(), replacement.lease().leaseId());

        assertThrows(IllegalStateException.class,
                () -> port.complete(initial.lease(), "stale-writer"));
        assertThrows(IllegalStateException.class,
                () -> port.abort(initial.lease()));
        assertEquals(IdempotencyDecisionType.IN_PROGRESS,
                port.begin(new IdempotencyRequest(
                        TENANT_A, "asset.create", "same-key", "fp", clock.instant().plusSeconds(15))).type());

        port.complete(replacement.lease(), "current-writer");
        assertEquals("current-writer",
                port.begin(new IdempotencyRequest(
                        TENANT_A, "asset.create", "same-key", "fp", clock.instant().plusSeconds(15)))
                        .replay().result());
    }

    @Test
    void ccCopiedLeaseTokenCannotCompleteAnotherTenant() {
        var clock = new MutableClock(START);
        var port = new InMemoryIdempotencyPort<String>(clock, ids());
        var a = port.begin(request(TENANT_A, "same-key", "fp", clock));
        var b = port.begin(request(TENANT_B, "same-key", "fp", clock));
        var forged = new IdempotencyLease(
                a.lease().leaseId(), TENANT_B, b.lease().operation(), b.lease().key(),
                b.lease().requestFingerprint(), b.lease().expiresAt());

        assertThrows(IllegalStateException.class, () -> port.complete(forged, "stolen"));
        assertThrows(IllegalStateException.class, () -> port.abort(forged));
        port.complete(b.lease(), "tenant-b");
        assertEquals("tenant-b", port.begin(request(TENANT_B, "same-key", "fp", clock)).replay().result());
    }

    @Test
    void ccApplicationMustReauthorizeBeforeReturningReplay() {
        var clock = new MutableClock(START);
        var port = new InMemoryIdempotencyPort<String>(clock, ids());
        var membershipActive = new AtomicBoolean(true);

        var identity = new StaticIdentityAdapter<String>().register("verified-test-credential",
                new ActorReference(ActorType.USER, ACTOR,
                        new IdentityReference("https://issuer.example", "subject"), null),
                AuthorizationProjection.empty(), AuthenticationContext.unspecified());
        var pipeline = new RequestContextPipeline<>(
                identity,
                (actorId, tenantId) -> membershipActive.get() && tenantId.equals(TENANT_A),
                (tenantId, module) -> new ModuleEntitlement(tenantId, module, true, Instant.EPOCH),
                (actor, action, resource) -> true,
                clock);
        var request = request(TENANT_A, "same-key", "fp", clock);

        var acquired = admittedBegin(pipeline, port, request);
        assertEquals(IdempotencyDecisionType.ACQUIRED, acquired.type());
        port.complete(acquired.lease(), "previously-allowed-result");

        membershipActive.set(false);
        var rejected = assertThrows(KernelAccessException.class,
                () -> admittedBegin(pipeline, port, request));
        assertEquals(KernelFailure.TENANT_MEMBERSHIP_REQUIRED, rejected.failure());

        // The stored replay still exists; the example enforces authorization
        // before asking the idempotency store for it. The store alone is not auth.
        membershipActive.set(true);
        var replay = admittedBegin(pipeline, port, request);
        assertEquals(IdempotencyDecisionType.REPLAY, replay.type());
        assertEquals("previously-allowed-result", replay.replay().result());
    }

    private IdempotencyDecision<String> admittedBegin(
            RequestContextPipeline<String> pipeline,
            InMemoryIdempotencyPort<String> port,
            IdempotencyRequest request) {
        pipeline.resolve(new RequestContextInput<>(
                "verified-test-credential", TenantContext.tenant(request.tenantId()),
                CorrelationContext.create(), EndpointPolicy.tenantModule("asset", "asset.create"),
                new ResourceReference("asset.asset", "opaque-asset", request.tenantId())));
        return port.begin(request);
    }

    private static IdempotencyRequest request(
            UUID tenant, String key, String fingerprint, Clock clock) {
        return new IdempotencyRequest(
                tenant, "asset.create", key, fingerprint, clock.instant().plusSeconds(60));
    }

    private static java.util.function.Supplier<UUID> ids() {
        var counter = new AtomicInteger();
        return () -> UUID.fromString("019a7f0e-9234-7abc-8def-%012x".formatted(counter.incrementAndGet()));
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        private MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            if (!ZoneOffset.UTC.equals(zone)) {
                throw new IllegalArgumentException("UTC only");
            }
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
