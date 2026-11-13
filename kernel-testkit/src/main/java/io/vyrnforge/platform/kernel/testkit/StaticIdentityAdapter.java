package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.ports.IdentityAdapter;

import java.util.HashMap;
import java.util.Map;

/** Deterministic identity adapter for consumer contract tests. */
public final class StaticIdentityAdapter<C> implements IdentityAdapter<C> {
    private final Map<C, IdentityTemplate> identities = new HashMap<>();

    public StaticIdentityAdapter<C> register(
            C credential,
            ActorReference actor,
            AuthorizationProjection authorization,
            AuthenticationContext authentication) {
        identities.put(credential, new IdentityTemplate(actor, authorization, authentication));
        return this;
    }

    @Override
    public ActorContext authenticate(C credential, TenantContext requestedTenant) {
        IdentityTemplate template = identities.get(credential);
        if (template == null) {
            throw new KernelAccessException(
                    KernelFailure.AUTHENTICATION_FAILED,
                    "Authentication could not be established.");
        }
        return new ActorContext(
                template.actor(),
                requestedTenant,
                template.authorization(),
                template.authentication());
    }

    private record IdentityTemplate(
            ActorReference actor,
            AuthorizationProjection authorization,
            AuthenticationContext authentication) {
    }
}
