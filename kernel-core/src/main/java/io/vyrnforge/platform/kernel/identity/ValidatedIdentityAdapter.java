package io.vyrnforge.platform.kernel.identity;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.ports.IdentityAdapter;

import java.util.Objects;

/**
 * Production adapter for credentials already authenticated by trusted provider middleware.
 *
 * Tenant membership is deliberately not inferred here; the request-context pipeline validates
 * requested tenant membership separately.
 */
public final class ValidatedIdentityAdapter
        implements IdentityAdapter<ValidatedIdentityCredential> {

    @Override
    public ActorContext authenticate(
            ValidatedIdentityCredential credential,
            TenantContext requestedTenant) {
        Objects.requireNonNull(credential, "credential");
        Objects.requireNonNull(requestedTenant, "requestedTenant");

        return new ActorContext(
                credential.actor(),
                requestedTenant,
                credential.authorization(),
                credential.authentication());
    }
}
