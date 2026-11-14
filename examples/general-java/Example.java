import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.errors.*;
import io.vyrnforge.platform.kernel.identity.*;
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.pipeline.*;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public class Example {
    public static void main(String[] args) {
        UUID tenant = UuidV7.generate();
        UUID otherTenant = UuidV7.generate();
        // Demo fixture only: in production create this after trusted authentication.
        var actor = new ActorReference(ActorType.USER, "user-42",
                new IdentityReference("https://identity.example", "subject-42"), null);
        var credential = new ValidatedIdentityCredential(actor,
                new AuthorizationProjection(Set.of(), Set.of(), Set.of("document.read", "profile.read")),
                new AuthenticationContext(Instant.now(), Set.of("session")));
        var pipeline = new RequestContextPipeline<>(new ValidatedIdentityAdapter(),
                (actorId, tenantId) -> actorId.equals("user-42") && tenant.equals(tenantId),
                (tenantId, module) -> new ModuleEntitlement(tenantId, module,
                        tenant.equals(tenantId) && module.equals("documents"), Instant.now()),
                (context, action, resource) -> context.authorization().hasPermission(action));
        // Existing resource ownership must come from the application's authoritative store.
        var document = new ResourceReference("document", "doc-123", tenant);
        var context = pipeline.resolve(new RequestContextInput<>(credential,
                TenantContext.tenant(tenant), CorrelationContext.create(),
                EndpointPolicy.tenantModule("documents", "document.read"), document));
        if (!context.actorContext().tenant().tenantId().equals(tenant)) {
            throw new AssertionError("Tenant mismatch");
        }
        System.out.println("Allowed: " + context.correlation().requestId());
        // Authenticated tenantless operation: no tenant membership or entitlement required.
        pipeline.resolve(new RequestContextInput<>(credential, TenantContext.none(), null,
                EndpointPolicy.tenantless("profile.read"), null));
        System.out.println("Tenantless profile read allowed");
        // Same authenticated actor cannot read another tenant's resource.
        expectDenied(() -> pipeline.resolve(new RequestContextInput<>(credential,
                TenantContext.tenant(tenant), null, EndpointPolicy.tenantModule("documents", "document.read"),
                new ResourceReference("document", "doc-456", otherTenant))), KernelFailure.TENANT_CONTEXT_MISMATCH);
        expectDenied(() -> pipeline.resolve(new RequestContextInput<>(credential,
                TenantContext.tenant(tenant), null, EndpointPolicy.tenantModule("documents", "document.delete"),
                document)), KernelFailure.DOMAIN_ACCESS_DENIED);
        expectDenied(() -> pipeline.resolve(new RequestContextInput<>(credential,
                TenantContext.tenant(tenant), null, EndpointPolicy.tenantModule("billing", "document.read"),
                document)), KernelFailure.MODULE_DISABLED);
        expectDenied(() -> pipeline.resolve(new RequestContextInput<>(credential,
                TenantContext.tenant(tenant), null, EndpointPolicy.tenantless("profile.read"), null)),
                KernelFailure.INVALID_CONTEXT);
        expectDenied(() -> pipeline.resolve(new RequestContextInput<>(credential,
                TenantContext.tenant(otherTenant), null, EndpointPolicy.tenantModule("documents", "document.read"),
                null)), KernelFailure.TENANT_MEMBERSHIP_REQUIRED);
        System.out.println("General-purpose example passed");
    }
    private static void expectDenied(Runnable action, KernelFailure expected) {
        try {
            action.run();
            throw new AssertionError("Expected " + expected);
        } catch (KernelAccessException e) {
            if (e.failure() != expected) throw new AssertionError("Unexpected " + e.failure(), e);
            System.out.println("Denied: " + expected);
        }
    }
}
