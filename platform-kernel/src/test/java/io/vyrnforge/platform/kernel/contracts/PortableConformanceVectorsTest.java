package io.vyrnforge.platform.kernel.contracts;

import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.context.TenantScope;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.observability.CorrelationPropagation;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

/**
 * A deliberately bounded executable subset of K-RD-V01 and K-RD-A01.
 * These checks validate released Java behavior, NOT full JSON Schema validation,
 * issuer authentication, cross-language serialization or production authorization.
 */
class PortableConformanceVectorsTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION = UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");
    private static final UUID EVENT_ID = UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab");

    @Test
    void pv04IdenticalSubjectsFromDifferentIssuersRemainDistinct() {
        var first = new IdentityReference("https://idp-a.example", "same-subject");
        var second = new IdentityReference("https://idp-b.example", "same-subject");
        assertNotEquals(first, second);
        assertEquals(first, new IdentityReference("https://idp-a.example", "same-subject"));
    }

    @Test
    void pv11Pv12Pv13TenantScopeMustMatchExplicitTenantId() {
        assertEquals(TenantScope.NONE, TenantContext.none().scope());
        assertNull(TenantContext.none().tenantId());
        assertEquals(TENANT_A, TenantContext.tenant(TENANT_A).tenantId());
        assertThrows(IllegalArgumentException.class, () -> new TenantContext(TenantScope.TENANT, null));
        assertThrows(IllegalArgumentException.class, () -> new TenantContext(TenantScope.NONE, TENANT_A));
    }

    @Test
    void pv17CanonicalV7RejectsV4AndUppercaseRepresentations() {
        assertTrue(UuidV7.isCanonical(CORRELATION.toString()));
        assertFalse(UuidV7.isCanonical(UUID.fromString("550e8400-e29b-41d4-a716-446655440000").toString()));
        assertFalse(UuidV7.isCanonical(CORRELATION.toString().toUpperCase(java.util.Locale.ROOT)));
    }

    @Test
    void pv18BoundedOpaqueTraceIsNotW3cValidation() {
        var root = CorrelationPropagation.root("not-a-valid-w3c-traceparent", null);
        assertEquals("not-a-valid-w3c-traceparent", root.traceparent());
        assertThrows(IllegalArgumentException.class,
                () -> CorrelationPropagation.root("bad\r\nheader", null));
    }

    @Test
    void pv16Acp02Acp04EventCorrelationAndCausationRemainDistinct() {
        EventEnvelope<Map<String, Object>> event = new EventEnvelope<>(
                EVENT_ID, "platform.record.created", 1, Instant.parse("2026-11-13T07:30:00Z"),
                TENANT_A, "platform", "platform.record", "opaque-id",
                CORRELATION, null, null, Map.of("ok", true));

        CorrelationContext received = CorrelationPropagation.fromEvent(event, null, null);
        assertEquals(CORRELATION, received.correlationId());
        assertEquals(EVENT_ID, received.causationId());
        assertNotEquals(EVENT_ID, received.requestId());
        assertTrue(UuidV7.isCanonical(received.requestId().toString()));

        CorrelationContext continued = CorrelationPropagation.continueInbound(CORRELATION, null, null);
        assertEquals(CORRELATION, continued.correlationId());
        assertNull(continued.causationId());
        assertNotEquals(received.requestId(), continued.requestId());
        assertThrows(IllegalArgumentException.class,
                () -> CorrelationPropagation.continueInbound(
                        UUID.fromString("550e8400-e29b-41d4-a716-446655440000"), null, null));
    }
}
