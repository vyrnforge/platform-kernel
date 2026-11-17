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

    @Test
    void idempotencyRequestRespectsExistingDatabaseColumnLimits() {
        Instant expiry = Instant.parse("2026-11-13T10:00:00Z");
        assertDoesNotThrow(() -> new IdempotencyRequest(TENANT,
                "a".repeat(192), "k".repeat(512), "f".repeat(512), expiry));
        assertThrows(IllegalArgumentException.class, () -> new IdempotencyRequest(TENANT,
                "a".repeat(193), "key", "fingerprint", expiry));
        assertThrows(IllegalArgumentException.class, () -> new IdempotencyRequest(TENANT,
                "asset.create", "k".repeat(513), "fingerprint", expiry));
        assertThrows(IllegalArgumentException.class, () -> new IdempotencyRequest(TENANT,
                "asset.create", "key", "f".repeat(513), expiry));
        // PostgreSQL varchar lengths count characters, not UTF-16 code units.
        assertDoesNotThrow(() -> new IdempotencyRequest(TENANT,
                "asset.create", "😀".repeat(512), "f", expiry));
        assertThrows(IllegalArgumentException.class, () -> new IdempotencyRequest(TENANT,
                "asset.create", "😀".repeat(513), "f", expiry));
    }

    @Test
    void auditRequiresConsistentTenantForTenantOwnedResources() {
        UUID other = UUID.fromString("019a7f0e-3234-7abc-8def-1234567890ab");
        assertThrows(IllegalArgumentException.class, () -> scopedAudit(TENANT, other));
        assertThrows(IllegalArgumentException.class, () -> scopedAudit(null, TENANT));
        assertDoesNotThrow(() -> scopedAudit(TENANT, TENANT));
        assertDoesNotThrow(() -> scopedAudit(TENANT, null));
        assertDoesNotThrow(() -> scopedAudit(null, null));
    }

    @Test
    void runtimeRejectsInvalidWireFieldShapes() {
        assertThrows(IllegalArgumentException.class, () ->
                io.vyrnforge.platform.kernel.context.TenantContext.tenant(UUID.randomUUID()));
        assertThrows(IllegalArgumentException.class, () ->
                new io.vyrnforge.platform.kernel.context.ModuleEntitlement(TENANT, "Bad Key", true, null));
        assertThrows(IllegalArgumentException.class, () ->
                new io.vyrnforge.platform.kernel.context.ModuleEntitlement(UUID.randomUUID(), "asset", true, null));
        assertThrows(IllegalArgumentException.class, () ->
                new ResourceReference("asset.asset", "x".repeat(513), TENANT));
        assertThrows(IllegalArgumentException.class, () -> sampleEvent("asset-1", "scalar"));
        assertThrows(IllegalArgumentException.class, () -> sampleEvent("asset-1", java.util.List.of(1)));
        assertThrows(IllegalArgumentException.class, () -> sampleEvent("x".repeat(513), Map.of()));
        assertDoesNotThrow(() -> sampleEvent("x".repeat(512), Map.of("label", "Laptop")));
    }

    private AuditEvent scopedAudit(UUID tenant, UUID resourceTenant) {
        return new AuditEvent(UUID.fromString("019a7f0e-a234-7abc-8def-1234567890ab"),
                Instant.EPOCH, tenant, actor(), "asset.assign",
                new ResourceReference("asset.asset", "asset-1", resourceTenant),
                AuditOutcome.SUCCESS, "asset", CORRELATION, null, null);
    }

    private EventEnvelope<Object> sampleEvent(String subject, Object payload) {
        return new EventEnvelope<>(UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab"),
                "asset.asset.created", 1, Instant.EPOCH, TENANT, "asset", "asset.asset",
                subject, CORRELATION, null, actor(), payload);
    }

    private ActorReference actor() {
        return new ActorReference(
                ActorType.USER,
                "019a7f0e-1234-7abc-8def-1234567890ab",
                new IdentityReference("https://idp.example.com", "subject"),
                "Example User");
    }
}
