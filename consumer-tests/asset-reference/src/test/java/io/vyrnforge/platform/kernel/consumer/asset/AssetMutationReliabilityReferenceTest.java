package io.vyrnforge.platform.kernel.consumer.asset;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.audit.AuditOutcome;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.file.FileReference;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyDecisionType;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyRequest;
import io.vyrnforge.platform.kernel.testkit.InMemoryAuditIntentPort;
import io.vyrnforge.platform.kernel.testkit.InMemoryEventIntentPort;
import io.vyrnforge.platform.kernel.testkit.InMemoryIdempotencyPort;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AssetMutationReliabilityReferenceTest {
    private static final UUID TENANT = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION = UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");
    private static final String ASSET_ID = "019a7f0e-5234-7abc-8def-1234567890ab";

    @Test
    void assetMutationCanComposeIdempotencyEventAndAuditWithoutInfrastructureCoupling() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-13T09:00:00Z"), ZoneOffset.UTC);
        var idempotency = new InMemoryIdempotencyPort<String>(
                clock,
                () -> UUID.fromString("019a7f0e-b234-7abc-8def-1234567890ab"));
        var events = new InMemoryEventIntentPort();
        var audits = new InMemoryAuditIntentPort();

        IdempotencyRequest request = new IdempotencyRequest(
                TENANT,
                "asset.assign",
                "client-request-123",
                "sha256:assignment-request-v1",
                clock.instant().plusSeconds(300));

        var decision = idempotency.begin(request);
        assertEquals(IdempotencyDecisionType.ACQUIRED, decision.type());

        ActorReference actor = actor();
        ResourceReference resource = new ResourceReference("asset.asset", ASSET_ID, TENANT);

        EventEnvelope<Map<String, Object>> event = new EventEnvelope<>(
                UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab"),
                "asset.asset.assigned",
                1,
                clock.instant(),
                TENANT,
                "asset",
                "asset.asset",
                ASSET_ID,
                CORRELATION,
                null,
                actor,
                Map.of("assigned_to", actor.actorId()));

        AuditEvent audit = new AuditEvent(
                UUID.fromString("019a7f0e-a234-7abc-8def-1234567890ab"),
                clock.instant(),
                TENANT,
                actor,
                "asset.assign",
                resource,
                AuditOutcome.SUCCESS,
                "asset",
                CORRELATION,
                "Asset assigned through reference mutation.",
                Map.of("assigned_to", actor.actorId()));

        events.accept(event);
        audits.accept(audit);

        // A real domain implementation would make business state + required intents atomic.
        // Only after required intents are accepted is the idempotent result completed.
        idempotency.complete(decision.lease(), ASSET_ID);

        var replay = idempotency.begin(request);

        assertEquals(IdempotencyDecisionType.REPLAY, replay.type());
        assertEquals(ASSET_ID, replay.replay().result());
        assertEquals(1, events.snapshot().size());
        assertEquals(CORRELATION, events.snapshot().getFirst().correlationId());
        assertEquals(1, audits.snapshot().size());
        assertEquals(CORRELATION, audits.snapshot().getFirst().correlationId());
    }

    @Test
    void sameIdempotencyKeyWithDifferentRequestSemanticsConflicts() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-13T09:00:00Z"), ZoneOffset.UTC);
        var idempotency = new InMemoryIdempotencyPort<String>(
                clock,
                () -> UUID.fromString("019a7f0e-b234-7abc-8def-1234567890ab"));

        var acquired = idempotency.begin(new IdempotencyRequest(
                TENANT,
                "asset.assign",
                "client-request-123",
                "fingerprint-a",
                clock.instant().plusSeconds(300)));
        assertEquals(IdempotencyDecisionType.ACQUIRED, acquired.type());

        var conflict = idempotency.begin(new IdempotencyRequest(
                TENANT,
                "asset.assign",
                "client-request-123",
                "fingerprint-b",
                clock.instant().plusSeconds(300)));

        assertEquals(IdempotencyDecisionType.CONFLICT, conflict.type());
    }

    @Test
    void assetCanStoreFileReferenceWithoutTakingOwnershipOfFileMetadata() {
        FileReference reference = new FileReference(
                "storage-object-legacy-8842",
                TENANT,
                "file-storage",
                "purchase-order.pdf",
                "application/pdf",
                128_000L,
                Instant.parse("2026-11-13T08:30:00Z"));

        assertEquals("storage-object-legacy-8842", reference.fileId());
        assertEquals(TENANT, reference.ownerTenantId());
        assertNotNull(reference.name());
    }

    private ActorReference actor() {
        return new ActorReference(
                ActorType.USER,
                "019a7f0e-1234-7abc-8def-1234567890ab",
                new IdentityReference("https://iam.vyrnforge.example", "subject-123"),
                "Asset Operator");
    }
}
