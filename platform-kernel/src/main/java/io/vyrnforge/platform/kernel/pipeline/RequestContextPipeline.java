package io.vyrnforge.platform.kernel.pipeline;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ModuleEntitlement;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.ports.DomainAuthorizationHook;
import io.vyrnforge.platform.kernel.ports.IdentityAdapter;
import io.vyrnforge.platform.kernel.ports.ModuleEntitlementPort;
import io.vyrnforge.platform.kernel.ports.TenantMembershipPort;

import java.util.Objects;

/**
 * Framework-neutral Milestone 1 golden path.
 * Order is intentional: authenticate -> tenant -> entitlement -> domain authorization.
 */
public final class RequestContextPipeline<C> {
    private final IdentityAdapter<C> identityAdapter;
    private final TenantMembershipPort tenantMembershipPort;
    private final ModuleEntitlementPort moduleEntitlementPort;
    private final DomainAuthorizationHook domainAuthorizationHook;

    public RequestContextPipeline(
            IdentityAdapter<C> identityAdapter,
            TenantMembershipPort tenantMembershipPort,
            ModuleEntitlementPort moduleEntitlementPort,
            DomainAuthorizationHook domainAuthorizationHook) {
        this.identityAdapter = Objects.requireNonNull(identityAdapter, "identityAdapter");
        this.tenantMembershipPort = Objects.requireNonNull(tenantMembershipPort, "tenantMembershipPort");
        this.moduleEntitlementPort = Objects.requireNonNull(moduleEntitlementPort, "moduleEntitlementPort");
        this.domainAuthorizationHook = Objects.requireNonNull(domainAuthorizationHook, "domainAuthorizationHook");
    }

    public ResolvedRequestContext resolve(RequestContextInput<C> input) {
        Objects.requireNonNull(input, "input");

        ActorContext actorContext;
        try {
            actorContext = identityAdapter.authenticate(input.credential(), input.requestedTenant());
        } catch (KernelAccessException known) {
            throw known;
        } catch (RuntimeException failure) {
            throw new KernelAccessException(
                    KernelFailure.AUTHENTICATION_FAILED,
                    "Authentication could not be established.");
        }

        if (actorContext == null) {
            throw new KernelAccessException(
                    KernelFailure.AUTHENTICATION_FAILED,
                    "Authentication could not be established.");
        }
        if (!actorContext.tenant().equals(input.requestedTenant())) {
            throw new KernelAccessException(
                    KernelFailure.INVALID_CONTEXT,
                    "Identity adapter returned a tenant context different from the requested context.");
        }

        EndpointPolicy policy = input.endpointPolicy();
        ModuleEntitlement entitlement = null;

        if (input.resource() != null && input.resource().tenantId() != null) {
            TenantContext activeTenant = actorContext.tenant();
            if (!activeTenant.isTenantScoped()
                    || !input.resource().tenantId().equals(activeTenant.tenantId())) {
                throw new KernelAccessException(
                        KernelFailure.TENANT_CONTEXT_MISMATCH,
                        "The resource does not belong to the active tenant context.");
            }
        }

        // A tenantless policy cannot be used to establish a tenant-scoped context.
        // Keep the resource mismatch check above so cross-tenant resources stay hidden.
        if (!policy.tenantRequired() && actorContext.tenant().isTenantScoped()) {
            throw new KernelAccessException(
                    KernelFailure.INVALID_CONTEXT,
                    "A tenantless endpoint cannot establish an active tenant.");
        }

        if (policy.tenantRequired()) {
            TenantContext tenant = actorContext.tenant();
            if (!tenant.isTenantScoped()) {
                throw new KernelAccessException(
                        KernelFailure.TENANT_REQUIRED,
                        "An active tenant is required for this operation.");
            }

            if (!tenantMembershipPort.isMember(actorContext.actor().actorId(), tenant.tenantId())) {
                throw new KernelAccessException(
                        KernelFailure.TENANT_MEMBERSHIP_REQUIRED,
                        "The actor is not a member of the active tenant.");
            }

            entitlement = moduleEntitlementPort.getEntitlement(tenant.tenantId(), policy.moduleKey());
            if (entitlement == null
                    || !entitlement.tenantId().equals(tenant.tenantId())
                    || !entitlement.moduleKey().equals(policy.moduleKey())
                    || !entitlement.enabled()) {
                throw new KernelAccessException(
                        KernelFailure.MODULE_DISABLED,
                        "The requested module is not enabled for the active tenant.");
            }
        }

        if (!domainAuthorizationHook.authorize(actorContext, policy.action(), input.resource())) {
            throw new KernelAccessException(
                    KernelFailure.DOMAIN_ACCESS_DENIED,
                    "The actor is not authorized for this domain operation.");
        }

        return new ResolvedRequestContext(actorContext, input.correlation(), entitlement);
    }
}
