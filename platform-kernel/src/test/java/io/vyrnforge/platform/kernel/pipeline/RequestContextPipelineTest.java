package io.vyrnforge.platform.kernel.pipeline;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;
import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.ModuleEntitlement;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.ports.IdentityAdapter;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RequestContextPipelineTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");
    private static final String ACTOR_ID = "019a7f0e-1234-7abc-8def-1234567890ab";

    @Test
    void resolvesTenantScopedRequestInRequiredOrder() {
        IdentityAdapter<String> identity = identityAdapter(Set.of("asset.read"));
        var pipeline = new RequestContextPipeline<>(
                identity,
                (actorId, tenantId) -> actorId.equals(ACTOR_ID) && tenantId.equals(TENANT_A),
                (tenantId, moduleKey) -> new ModuleEntitlement(tenantId, moduleKey, true, Instant.EPOCH),
                (actor, action, resource) -> actor.authorization().hasPermission("asset.read"));

        CorrelationContext correlation = CorrelationContext.create();
        var resolved = pipeline.resolve(new RequestContextInput<>(
                "valid",
                TenantContext.tenant(TENANT_A),
                correlation,
                EndpointPolicy.tenantModule("asset", "asset.read"),
                new ResourceReference("asset.asset", "019a7f0e-5234-7abc-8def-1234567890ab", TENANT_A)));

        assertEquals(ACTOR_ID, resolved.actorContext().actor().actorId());
        assertEquals(TENANT_A, resolved.actorContext().tenant().tenantId());
        assertEquals(correlation.correlationId(), resolved.correlation().correlationId());
        assertNotNull(resolved.moduleEntitlement());
    }

    @Test
    void rejectsTenantlessActorForTenantOwnedEndpoint() {
        var pipeline = pipeline(identityAdapter(Set.of("asset.read")), true, true, true);

        KernelAccessException error = assertThrows(KernelAccessException.class, () -> pipeline.resolve(
                new RequestContextInput<>(
                        "valid",
                        TenantContext.none(),
                        CorrelationContext.create(),
                        EndpointPolicy.tenantModule("asset", "asset.read"),
                        null)));

        assertEquals(KernelFailure.TENANT_REQUIRED, error.failure());
    }

    @Test
    void rejectsCrossTenantMembership() {
        var pipeline = new RequestContextPipeline<>(
                identityAdapter(Set.of("asset.read")),
                (actorId, tenantId) -> tenantId.equals(TENANT_A),
                (tenantId, moduleKey) -> new ModuleEntitlement(tenantId, moduleKey, true, Instant.EPOCH),
                (actor, action, resource) -> true);

        KernelAccessException error = assertThrows(KernelAccessException.class, () -> pipeline.resolve(
                new RequestContextInput<>(
                        "valid",
                        TenantContext.tenant(TENANT_B),
                        CorrelationContext.create(),
                        EndpointPolicy.tenantModule("asset", "asset.read"),
                        null)));

        assertEquals(KernelFailure.TENANT_MEMBERSHIP_REQUIRED, error.failure());
    }

    @Test
    void rejectsDisabledModuleBeforeDomainAuthorization() {
        var pipeline = pipeline(identityAdapter(Set.of("asset.read")), true, false, true);

        KernelAccessException error = assertThrows(KernelAccessException.class, () -> pipeline.resolve(
                new RequestContextInput<>(
                        "valid",
                        TenantContext.tenant(TENANT_A),
                        CorrelationContext.create(),
                        EndpointPolicy.tenantModule("asset", "asset.read"),
                        null)));

        assertEquals(KernelFailure.MODULE_DISABLED, error.failure());
    }

    @Test
    void entitlementDoesNotReplaceDomainAuthorization() {
        var pipeline = pipeline(identityAdapter(Set.of()), true, true, false);

        KernelAccessException error = assertThrows(KernelAccessException.class, () -> pipeline.resolve(
                new RequestContextInput<>(
                        "valid",
                        TenantContext.tenant(TENANT_A),
                        CorrelationContext.create(),
                        EndpointPolicy.tenantModule("asset", "asset.read"),
                        null)));

        assertEquals(KernelFailure.DOMAIN_ACCESS_DENIED, error.failure());
    }

    @Test
    void rejectsTenantlessAccessToTenantOwnedResourceEvenOnTenantlessPolicy() {
        var pipeline = pipeline(identityAdapter(Set.of("profile.read")), false, false, true);

        KernelAccessException error = assertThrows(KernelAccessException.class, () -> pipeline.resolve(
                new RequestContextInput<>(
                        "valid",
                        TenantContext.none(),
                        CorrelationContext.create(),
                        EndpointPolicy.tenantless("profile.read"),
                        new ResourceReference("asset.asset", "019a7f0e-5234-7abc-8def-1234567890ab", TENANT_A))));

        assertEquals(KernelFailure.TENANT_CONTEXT_MISMATCH, error.failure());
    }

    @Test
    void tenantlessPolicyRejectsActiveTenantEvenForMatchingResource() {
        var pipeline = pipeline(identityAdapter(Set.of("asset.read")), false, false, true);
        var resource = new ResourceReference("asset.asset", "asset-1", TENANT_A);
        for (ResourceReference ref : new ResourceReference[]{resource, null}) {
            var error = assertThrows(KernelAccessException.class, () -> pipeline.resolve(
                    new RequestContextInput<>("valid", TenantContext.tenant(TENANT_A),
                            CorrelationContext.create(), EndpointPolicy.tenantless("asset.read"), ref)));
            assertEquals(KernelFailure.INVALID_CONTEXT, error.failure());
        }
    }

    @Test
    void tenantlessEndpointCanResolveWithoutMembershipOrEntitlement() {
        var pipeline = pipeline(identityAdapter(Set.of("profile.read")), false, false, true);

        var resolved = pipeline.resolve(new RequestContextInput<>(
                "valid",
                TenantContext.none(),
                CorrelationContext.create(),
                EndpointPolicy.tenantless("profile.read"),
                null));

        assertEquals(TenantContext.none(), resolved.actorContext().tenant());
        assertEquals(null, resolved.moduleEntitlement());
    }

    private RequestContextPipeline<String> pipeline(
            IdentityAdapter<String> identity,
            boolean member,
            boolean enabled,
            boolean domainAllowed) {
        return new RequestContextPipeline<>(
                identity,
                (actorId, tenantId) -> member,
                (tenantId, moduleKey) -> new ModuleEntitlement(tenantId, moduleKey, enabled, Instant.EPOCH),
                (actor, action, resource) -> domainAllowed);
    }

    private IdentityAdapter<String> identityAdapter(Set<String> permissions) {
        return (credential, requestedTenant) -> {
            if (!"valid".equals(credential)) {
                throw new IllegalArgumentException("invalid credential");
            }
            return new ActorContext(
                    new ActorReference(
                            ActorType.USER,
                            ACTOR_ID,
                            new IdentityReference("https://idp.example.com", "subject-123"),
                            "Example User"),
                    requestedTenant,
                    new AuthorizationProjection(Set.of("asset-operators"), Set.of("asset_manager"), permissions),
                    new AuthenticationContext(Instant.parse("2026-11-13T07:30:00Z"), Set.of("pwd")));
        };
    }
}
