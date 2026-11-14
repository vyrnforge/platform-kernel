package io.vyrnforge.platform.kernel.contracts;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.audit.AuditOutcome;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.file.FileReference;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyRequest;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ReliabilityContractsTest {
    private static final UUID TENANT = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION = UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");

    @Test
    void eventEnvelopeAllowsTenantlessAndActorlessSystemEvent() {
        EventEnvelope<Map<String, Object>> event = new EventEnvelope<>(
                UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab"),
                "platform.health.changed",
                1,
                Instant.parse("2026-11-13T09:00:00Z"),
                null,
                "platform",
                "platform.health",
                "kernel",
                CORRELATION,
                null,
                null,
                Map.of("status", "ready"));

        assertNull(event.tenantId());
        assertNull(event.actor());
    }

    @Test
    void eventEnvelopeRejectsNonV7KernelIdentifiers() {
        assertThrows(IllegalArgumentException.class, () -> new EventEnvelope<>(
                UUID.randomUUID(),
                "asset.asset.created",
                1,
                Instant.EPOCH,
                TENANT,
                "asset",
                "asset.asset",
                "asset-1",
                CORRELATION,
                null,
                actor(),
                Map.of()));
    }

    @Test
    void auditChangesRemainImmutableButMayContainJsonNullSemantics() {
        Map<String, Object> changes = new LinkedHashMap<>();
        changes.put("previous_owner", null);
        changes.put("new_owner", "user-1");

        AuditEvent audit = new AuditEvent(
                UUID.fromString("019a7f0e-a234-7abc-8def-1234567890ab"),
                Instant.parse("2026-11-13T09:00:00Z"),
                TENANT,
                actor(),
                "asset.assign",
                new ResourceReference("asset.asset", "asset-1", TENANT),
                AuditOutcome.SUCCESS,
                "asset",
                CORRELATION,
                null,
                changes);

        changes.put("new_owner", "mutated");

        assertEquals("user-1", audit.changes().get("new_owner"));
        assertNull(audit.changes().get("previous_owner"));
        assertThrows(UnsupportedOperationException.class, () -> audit.changes().put("x", "y"));
    }

    @Test
    void fileReferenceKeepsExternalIdsOpaque() {
        FileReference reference = new FileReference(
                "legacy-file-id:42",
                TENANT,
                "file-storage",
                "invoice.pdf",
                "application/pdf",
                42L,
                Instant.parse("2026-11-13T09:00:00Z"));

        assertEquals("legacy-file-id:42", reference.fileId());
    }

    @Test
    void fileReferenceDoesNotRequireTenantForLegitimateGlobalFile() {
        assertDoesNotThrow(() -> new FileReference(
                "global-file-1",
                null,
                "file-storage"));
    }

    @Test
    void apiIdempotencyRequiresTenantScope() {
        assertThrows(NullPointerException.class, () -> new IdempotencyRequest(
                null,
                "asset.create",
                "key",
                "fingerprint",
                Instant.parse("2026-11-13T10:00:00Z")));
    }

    private ActorReference actor() {
        return new ActorReference(
                ActorType.USER,
                "019a7f0e-1234-7abc-8def-1234567890ab",
                new IdentityReference("https://idp.example.com", "subject"),
                "Example User");
    }
}
