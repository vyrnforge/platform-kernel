package io.vyrnforge.platform.kernel.config;

import io.vyrnforge.platform.kernel.context.TenantContext;

import java.util.Optional;

/**
 * Exact-scope lookup for non-secret namespaced configuration.
 *
 * TenantContext.none() represents global/platform scope. TenantContext.tenant(id) represents
 * a tenant-specific lookup. This port does not define implicit fallback between scopes.
 *
 * Secrets and credentials belong in a secrets manager and must not be stored through this contract.
 */
@FunctionalInterface
public interface ConfigurationPort {
    Optional<String> get(ConfigurationKey key, TenantContext scope);
}
