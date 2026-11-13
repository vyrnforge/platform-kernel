package io.vyrnforge.platform.kernel.pipeline;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.ModuleEntitlement;

import java.util.Objects;

public record ResolvedRequestContext(
        ActorContext actorContext,
        CorrelationContext correlation,
        ModuleEntitlement moduleEntitlement) {

    public ResolvedRequestContext {
        Objects.requireNonNull(actorContext, "actorContext");
        Objects.requireNonNull(correlation, "correlation");
    }
}
