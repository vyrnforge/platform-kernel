package io.vyrnforge.platform.kernel.context;

import java.util.Objects;

/** Provider-neutral authenticated actor context consumed by products. */
public record ActorContext(
        ActorReference actor,
        TenantContext tenant,
        AuthorizationProjection authorization,
        AuthenticationContext authentication) {

    public ActorContext {
        Objects.requireNonNull(actor, "actor");
        Objects.requireNonNull(tenant, "tenant");
        authorization = authorization == null ? AuthorizationProjection.empty() : authorization;
        authentication = authentication == null ? AuthenticationContext.unspecified() : authentication;
    }
}
