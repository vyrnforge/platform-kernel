package io.vyrnforge.platform.kernel.context;

import java.util.Objects;

/** Stable normalized actor reference safe for request context, events, and audit. */
public record ActorReference(
        ActorType actorType,
        String actorId,
        IdentityReference identity,
        String displayName) {

    public ActorReference {
        Objects.requireNonNull(actorType, "actorType");
        Objects.requireNonNull(actorId, "actorId");
        if (actorId.isBlank()) {
            throw new IllegalArgumentException("actorId must not be blank");
        }
        if (displayName != null && displayName.isBlank()) {
            displayName = null;
        }
    }
}
