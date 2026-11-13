package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.ports.DomainAuthorizationHook;

import java.util.Map;

/** Simple test-only domain policy: map action -> normalized permission. */
public final class PermissionAuthorizationHook implements DomainAuthorizationHook {
    private final Map<String, String> requiredPermissions;

    public PermissionAuthorizationHook(Map<String, String> requiredPermissions) {
        this.requiredPermissions = Map.copyOf(requiredPermissions);
    }

    @Override
    public boolean authorize(ActorContext actorContext, String action, ResourceReference resource) {
        String required = requiredPermissions.get(action);
        return required == null || actorContext.authorization().hasPermission(required);
    }
}
