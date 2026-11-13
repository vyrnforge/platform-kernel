package io.vyrnforge.platform.kernel.observability;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;
import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.pipeline.ResolvedRequestContext;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CorrelationTelemetryTest {
    private static final UUID TENANT = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION = UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");
    private static final UUID EVENT_ID = UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab");

    @Test
    void inboundContinuationPreservesCorrelationAndCreatesNewRequestId() {
        CorrelationContext context = CorrelationPropagation.continueInbound(
                CORRELATION,
                "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
                null);

        assertEquals(CORRELATION, context.correlationId());
        assertNotEquals(CORRELATION, context.requestId());
        assertEquals("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01", context.traceparent());
    }

    @Test
    void eventConsumptionPreservesCorrelationAndUsesEventAsCausation() {
        EventEnvelope<Map<String, Object>> event = new EventEnvelope<>(
                EVENT_ID,
                "asset.asset.assigned",
                1,
                Instant.parse("2026-11-13T09:00:00Z"),
                TENANT,
                "asset",
                "asset.asset",
                "asset-1",
                CORRELATION,
                null,
                actor(),
                Map.of());

        CorrelationContext consumed = CorrelationPropagation.fromEvent(event, null, null);

        assertEquals(CORRELATION, consumed.correlationId());
        assertEquals(EVENT_ID, consumed.causationId());
    }

    @Test
    void traceMetadataRejectsHeaderInjection() {
        assertThrows(IllegalArgumentException.class, () ->
                CorrelationPropagation.root("safe\r\ninjected: value", null));
    }

    @Test
    void safeTelemetryDefaultsExcludeTenantAndActor() {
        ResolvedRequestContext context = requestContext();

        Map<String, String> attributes = TelemetryAttributes.forRequest(
                "asset",
                "test",
                "asset.read",
                "success",
                context,
                TelemetryAttributePolicy.safeDefaults());

        assertEquals(CORRELATION.toString(), attributes.get("correlation_id"));
        assertFalse(attributes.containsKey("tenant_id"));
        assertFalse(attributes.containsKey("actor_id"));
    }

    @Test
    void explicitPolicyCanIncludeTenantAndActor() {
        Map<String, String> attributes = TelemetryAttributes.forRequest(
                "asset",
                "test",
                "asset.read",
                "success",
                requestContext(),
                TelemetryAttributePolicy.tenantAndActor());

        assertEquals(TENANT.toString(), attributes.get("tenant_id"));
        assertEquals("actor-1", attributes.get("actor_id"));
    }

    private ResolvedRequestContext requestContext() {
        ActorContext actorContext = new ActorContext(
                actor(),
                TenantContext.tenant(TENANT),
                new AuthorizationProjection(Set.of(), Set.of(), Set.of()),
                AuthenticationContext.unspecified());

        return new ResolvedRequestContext(
                actorContext,
                new CorrelationContext(
                        UUID.fromString("019a7f0e-8234-7abc-8def-1234567890ab"),
                        CORRELATION,
                        null,
                        null,
                        null),
                null);
    }

    private ActorReference actor() {
        return new ActorReference(
                ActorType.USER,
                "actor-1",
                new IdentityReference("https://idp.example.com", "subject"),
                "Example User");
    }
}
