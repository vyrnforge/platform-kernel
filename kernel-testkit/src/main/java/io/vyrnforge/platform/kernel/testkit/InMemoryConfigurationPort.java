package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.config.ConfigurationKey;
import io.vyrnforge.platform.kernel.config.ConfigurationPort;
import io.vyrnforge.platform.kernel.context.TenantContext;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Exact-scope test-only non-secret configuration source.
 * No implicit global-to-tenant fallback is performed.
 */
public final class InMemoryConfigurationPort implements ConfigurationPort {
    private final Map<Key, String> values = new HashMap<>();

    public synchronized InMemoryConfigurationPort set(
            ConfigurationKey key,
            TenantContext scope,
            String value) {
        Objects.requireNonNull(value, "value");
        values.put(
                new Key(
                        Objects.requireNonNull(key, "key"),
                        Objects.requireNonNull(scope, "scope")),
                value);
        return this;
    }

    public synchronized InMemoryConfigurationPort remove(
            ConfigurationKey key,
            TenantContext scope) {
        values.remove(new Key(
                Objects.requireNonNull(key, "key"),
                Objects.requireNonNull(scope, "scope")));
        return this;
    }

    @Override
    public synchronized Optional<String> get(
            ConfigurationKey key,
            TenantContext scope) {
        return Optional.ofNullable(values.get(new Key(
                Objects.requireNonNull(key, "key"),
                Objects.requireNonNull(scope, "scope"))));
    }

    private record Key(ConfigurationKey key, TenantContext scope) {
    }
}
