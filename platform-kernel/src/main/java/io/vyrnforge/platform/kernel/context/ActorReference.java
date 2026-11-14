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
        if (actorId.isBlank() || actorId.codePointCount(0, actorId.length()) > 512) {
            throw new IllegalArgumentException("actorId must not be blank");
        }
        if (displayName != null && displayName.codePointCount(0, displayName.length()) > 256) {
            throw new IllegalArgumentException("displayName exceeds 256 characters");
        }
        if (displayName != null && displayName.isBlank()) {
            displayName = null;
        }
    }
}
