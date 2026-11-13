package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.feature.FeatureFlagKey;
import io.vyrnforge.platform.kernel.feature.FeatureFlagPort;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * Exact-scope test-only feature flags. Unconfigured flags default to disabled.
 * No implicit global-to-tenant fallback is performed.
 */
public final class InMemoryFeatureFlagPort implements FeatureFlagPort {
    private final Map<Key, Boolean> flags = new HashMap<>();

    public synchronized InMemoryFeatureFlagPort set(
            FeatureFlagKey flag,
            TenantContext scope,
            boolean enabled) {
        flags.put(
                new Key(
                        Objects.requireNonNull(flag, "flag"),
                        Objects.requireNonNull(scope, "scope")),
                enabled);
        return this;
    }

    @Override
    public synchronized boolean isEnabled(FeatureFlagKey flag, TenantContext scope) {
        return flags.getOrDefault(
                new Key(
                        Objects.requireNonNull(flag, "flag"),
                        Objects.requireNonNull(scope, "scope")),
                false);
    }

    private record Key(FeatureFlagKey flag, TenantContext scope) {
    }
}
