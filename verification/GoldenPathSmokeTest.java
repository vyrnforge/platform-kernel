import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.pipeline.*;
import io.vyrnforge.platform.kernel.testkit.*;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public final class GoldenPathSmokeTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");
    private static final String ACTOR_ID = "019a7f0e-1234-7abc-8def-1234567890ab";

    public static void main(String[] args) {
        verifyUuidV7();
        verifyHappyPath();
        verifyTenantlessDenied();
        verifyCrossTenantMembershipDenied();
        verifyCrossTenantResourceDenied();
        verifyModuleDisabled();
        verifyDomainAuthorizationStillRequired();
        System.out.println("GoldenPathSmokeTest: all checks passed");
    }

    private static RequestContextPipeline<String> pipeline(boolean memberA, boolean assetEnabled, Set<String> permissions) {
        var identity = new StaticIdentityAdapter<String>().register(
                "valid",
                new ActorReference(
                        ActorType.USER,
                        ACTOR_ID,
                        new IdentityReference("https://idp.example.com", "subject-123"),
                        "Example User"),
                new AuthorizationProjection(Set.of("asset-operators"), Set.of("asset_manager"), permissions),
                new AuthenticationContext(Instant.parse("2026-11-13T07:30:00Z"), Set.of("pwd")));

        var memberships = new InMemoryTenantMembershipPort();
        if (memberA) memberships.add(ACTOR_ID, TENANT_A);

        var entitlements = new InMemoryModuleEntitlementPort().set(TENANT_A, "asset", assetEnabled);
        var authorization = new PermissionAuthorizationHook(Map.of("asset.read", "asset.read", "profile.read", "profile.read"));

        return new RequestContextPipeline<>(identity, memberships, entitlements, authorization);
    }

    private static void verifyUuidV7() {
        String generated = UuidV7.generate().toString();
        check(UuidV7.isCanonical(generated), "generated UUID must be canonical UUIDv7");
    }

    private static void verifyHappyPath() {
        var correlation = CorrelationContext.create();
        var result = pipeline(true, true, Set.of("asset.read")).resolve(new RequestContextInput<>(
                "valid",
                TenantContext.tenant(TENANT_A),
                correlation,
                EndpointPolicy.tenantModule("asset", "asset.read"),
                new ResourceReference("asset.asset", "asset-1", TENANT_A)));
        check(result.actorContext().actor().actorId().equals(ACTOR_ID), "actor must propagate");
        check(result.correlation().correlationId().equals(correlation.correlationId()), "correlation must propagate");
        check(result.moduleEntitlement() != null && result.moduleEntitlement().enabled(), "module must be enabled");
    }

    private static void verifyTenantlessDenied() {
        expect(KernelFailure.TENANT_REQUIRED, () -> pipeline(true, true, Set.of("asset.read")).resolve(new RequestContextInput<>(
                "valid", TenantContext.none(), CorrelationContext.create(),
                EndpointPolicy.tenantModule("asset", "asset.read"), null)));
    }

    private static void verifyCrossTenantMembershipDenied() {
        expect(KernelFailure.TENANT_MEMBERSHIP_REQUIRED, () -> pipeline(true, true, Set.of("asset.read")).resolve(new RequestContextInput<>(
                "valid", TenantContext.tenant(TENANT_B), CorrelationContext.create(),
                EndpointPolicy.tenantModule("asset", "asset.read"), null)));
    }

    private static void verifyCrossTenantResourceDenied() {
        expect(KernelFailure.TENANT_CONTEXT_MISMATCH, () -> pipeline(true, true, Set.of("asset.read")).resolve(new RequestContextInput<>(
                "valid", TenantContext.tenant(TENANT_A), CorrelationContext.create(),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                new ResourceReference("asset.asset", "asset-b", TENANT_B))));
    }

    private static void verifyModuleDisabled() {
        expect(KernelFailure.MODULE_DISABLED, () -> pipeline(true, false, Set.of("asset.read")).resolve(new RequestContextInput<>(
                "valid", TenantContext.tenant(TENANT_A), CorrelationContext.create(),
                EndpointPolicy.tenantModule("asset", "asset.read"), null)));
    }

    private static void verifyDomainAuthorizationStillRequired() {
        expect(KernelFailure.DOMAIN_ACCESS_DENIED, () -> pipeline(true, true, Set.of()).resolve(new RequestContextInput<>(
                "valid", TenantContext.tenant(TENANT_A), CorrelationContext.create(),
                EndpointPolicy.tenantModule("asset", "asset.read"), null)));
    }

    private static void expect(KernelFailure expected, Runnable action) {
        try {
            action.run();
            throw new AssertionError("expected failure " + expected);
        } catch (KernelAccessException e) {
            check(e.failure() == expected, "expected " + expected + " but got " + e.failure());
        }
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
