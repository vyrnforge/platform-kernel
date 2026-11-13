package io.vyrnforge.platform.kernel.consumer.asset;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;
import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.health.HealthAggregator;
import io.vyrnforge.platform.kernel.health.HealthProbe;
import io.vyrnforge.platform.kernel.health.HealthSnapshot;
import io.vyrnforge.platform.kernel.health.ProbeResult;
import io.vyrnforge.platform.kernel.health.ProbeStatus;
import io.vyrnforge.platform.kernel.health.ProbeType;
import io.vyrnforge.platform.kernel.observability.TelemetryAttributePolicy;
import io.vyrnforge.platform.kernel.observability.TelemetryAttributes;
import io.vyrnforge.platform.kernel.pipeline.ResolvedRequestContext;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssetObservabilityHealthReferenceTest {
    private static final UUID TENANT =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID REQUEST =
            UUID.fromString("019a7f0e-8234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION =
            UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");

    @Test
    void assetCanEmitStandardTelemetryWithoutImplicitIdentityDisclosure() {
        ResolvedRequestContext context = context();

        Map<String, String> safe = TelemetryAttributes.forRequest(
                "asset",
                "test",
                "asset.read",
                "success",
                context,
                TelemetryAttributePolicy.safeDefaults());

        assertEquals("asset", safe.get("service"));
        assertEquals(REQUEST.toString(), safe.get("request_id"));
        assertEquals(CORRELATION.toString(), safe.get("correlation_id"));
        assertFalse(safe.containsKey("tenant_id"));
        assertFalse(safe.containsKey("actor_id"));

        Map<String, String> tenantAware = TelemetryAttributes.forRequest(
                "asset",
                "test",
                "asset.read",
                "success",
                context,
                TelemetryAttributePolicy.tenantOnly());

        assertEquals(TENANT.toString(), tenantAware.get("tenant_id"));
        assertFalse(tenantAware.containsKey("actor_id"));
    }

    @Test
    void assetReadinessCanFailWithoutDeclaringProcessDead() {
        Clock clock = Clock.fixed(
                Instant.parse("2026-11-13T09:00:00Z"),
                ZoneOffset.UTC);

        HealthAggregator health = new HealthAggregator(
                clock,
                List.of(
                        HealthProbe.liveness("self", ProbeResult::up),
                        HealthProbe.readiness(
                                "file-storage",
                                () -> ProbeResult.down("DEPENDENCY_UNAVAILABLE"))));

        HealthSnapshot liveness = health.check(ProbeType.LIVENESS);
        HealthSnapshot readiness = health.check(ProbeType.READINESS);

        assertTrue(liveness.healthy());
        assertEquals(ProbeStatus.UP, liveness.status());
        assertFalse(readiness.healthy());
        assertEquals(ProbeStatus.DOWN, readiness.status());
        assertEquals(
                "DEPENDENCY_UNAVAILABLE",
                readiness.components().get("file-storage").code());
    }

    private ResolvedRequestContext context() {
        ActorReference actor = new ActorReference(
                ActorType.USER,
                "019a7f0e-1234-7abc-8def-1234567890ab",
                new IdentityReference("https://iam.vyrnforge.example", "subject-123"),
                "Asset Operator");

        ActorContext actorContext = new ActorContext(
                actor,
                TenantContext.tenant(TENANT),
                new AuthorizationProjection(
                        Set.of("asset-operators"),
                        Set.of("asset_manager"),
                        Set.of("asset.read")),
                AuthenticationContext.unspecified());

        return new ResolvedRequestContext(
                actorContext,
                new CorrelationContext(
                        REQUEST,
                        CORRELATION,
                        null,
                        null,
                        null),
                null);
    }
}
