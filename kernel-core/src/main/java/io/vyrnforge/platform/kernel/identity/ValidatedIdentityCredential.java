package io.vyrnforge.platform.kernel.identity;

import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;

import java.util.Objects;

/**
 * Provider-neutral result of an upstream authentication verifier.
 *
 * This type never carries the raw credential/token. Native IAM or external-IdP middleware
 * verifies signature/issuer/audience/expiry according to that provider's contract, then
 * supplies only the documented normalized identity projection.
 */
public record ValidatedIdentityCredential(
        ActorReference actor,
        AuthorizationProjection authorization,
        AuthenticationContext authentication) {

    public ValidatedIdentityCredential {
        Objects.requireNonNull(actor, "actor");
        authorization = authorization == null
                ? AuthorizationProjection.empty()
                : authorization;
        authentication = authentication == null
                ? AuthenticationContext.unspecified()
                : authentication;
    }
}
