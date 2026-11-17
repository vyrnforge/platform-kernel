package io.vyrnforge.platform.kernel.pipeline;

import io.vyrnforge.platform.kernel.module.ModuleKeys;

/** Cross-cutting endpoint requirements. Domain authorization remains in DomainAuthorizationHook. */
public record EndpointPolicy(boolean tenantRequired, String moduleKey, String action) {
    public EndpointPolicy {
        if (tenantRequired) {
            moduleKey = ModuleKeys.require(moduleKey);
        }
        if (action == null || action.isBlank()) {
            throw new IllegalArgumentException("action must not be blank");
        }
    }

    public static EndpointPolicy tenantModule(String moduleKey, String action) {
        return new EndpointPolicy(true, moduleKey, action);
    }

    public static EndpointPolicy tenantless(String action) {
        return new EndpointPolicy(false, null, action);
    }
}
