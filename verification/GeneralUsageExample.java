import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.identity.*;
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.pipeline.*;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

/**
 * Standalone Java 21 example: only the main platform-kernel JAR is required.
 * Synthetic identities/stores are demonstration fixtures, not authentication.
 */
public final class GeneralUsageExample {
    public static void main(String[] args) {
        // Independent primitives: no identity provider or database required.
        UUID tenant = UuidV7.generate();
        var correlation = CorrelationContext.create();
        check(UuidV7.isCanonical(tenant.toString()), "UUIDv7");

        // A trusted authentication layer would supply this projection.
        // This fixed synthetic actor is for the demonstration only.
        var identity = new ValidatedIdentityCredential(
                new ActorReference(ActorType.USER, "demo-user",
                        new IdentityReference("https://idp.example.org", "subject-1"), null),
                new AuthorizationProjection(Set.of(), Set.of(), Set.of("profile.read", "records.read")),
                new AuthenticationContext(Instant.now(), Set.of("demo")));

        var pipeline = new RequestContextPipeline<>(
                new ValidatedIdentityAdapter(),
                (actorId, tenantId) -> "demo-user".equals(actorId) && tenant.equals(tenantId),
                (tenantId, moduleKey) -> tenant.equals(tenantId) && "records".equals(moduleKey)
                        ? new ModuleEntitlement(tenantId, moduleKey, true, Instant.now()) : null,
                (actor, action, resource) -> actor.authorization().hasPermission(action));

        // Non-tenant-owned profile operation. Still authenticates and authorizes.
        var profile = pipeline.resolve(new RequestContextInput<>(
                identity, TenantContext.none(), correlation,
                EndpointPolicy.tenantless("profile.read"), null));
        check(profile.moduleEntitlement() == null, "tenantless entitlement must be absent");

        // Tenant-scoped operation with application-defined module and resource.
        // Resource ownership must come from authoritative application data.
        var policy = EndpointPolicy.tenantModule("records", "records.read");
        var record = new ResourceReference("record", "record-1", tenant);
        var resolved = pipeline.resolve(new RequestContextInput<>(
                identity, TenantContext.tenant(tenant), correlation, policy, record));
        check(resolved.moduleEntitlement().enabled(), "module enabled");
        check(resolved.correlation().correlationId().equals(correlation.correlationId()),
                "correlation propagated");

        // No tenantless bypass, cross-tenant access or permission bypass.
        expect(KernelFailure.TENANT_CONTEXT_MISMATCH, () -> pipeline.resolve(new RequestContextInput<>(
                identity, TenantContext.tenant(tenant), correlation, policy,
                new ResourceReference("record", "record-2", UuidV7.generate()))));
        expect(KernelFailure.INVALID_CONTEXT, () -> pipeline.resolve(new RequestContextInput<>(
                identity, TenantContext.tenant(tenant), correlation,
                EndpointPolicy.tenantless("profile.read"), null)));
        expect(KernelFailure.DOMAIN_ACCESS_DENIED, () -> pipeline.resolve(new RequestContextInput<>(
                identity, TenantContext.tenant(tenant), correlation,
                EndpointPolicy.tenantModule("records", "records.delete"), record)));

        System.out.println("GeneralUsageExample: independent primitives, tenantless and tenant-scoped requests passed");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void expect(KernelFailure failure, Runnable operation) {
        try {
            operation.run();
            throw new AssertionError("Expected " + failure);
        } catch (KernelAccessException e) {
            check(e.failure() == failure, "Expected " + failure + ", got " + e.failure());
        }
    }
}
