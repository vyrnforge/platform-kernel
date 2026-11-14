package io.vyrnforge.platform.kernel.ports;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ResourceReference;

/** Domain-owned authorization decision. The kernel supplies plumbing, not domain policy semantics. */
@FunctionalInterface
public interface DomainAuthorizationHook {
    boolean authorize(ActorContext actorContext, String action, ResourceReference resource);
}
