package io.vyrnforge.platform.kernel.ports;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.TenantContext;

/**
 * Provider-specific authentication adapter. Product/domain code consumes only the normalized ActorContext.
 * The requested tenant is context to normalize, not proof of membership; membership is checked separately.
 */
@FunctionalInterface
public interface IdentityAdapter<C> {
    ActorContext authenticate(C credential, TenantContext requestedTenant);
}
