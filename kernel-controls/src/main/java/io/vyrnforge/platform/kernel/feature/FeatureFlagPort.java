package io.vyrnforge.platform.kernel.feature;

import io.vyrnforge.platform.kernel.context.TenantContext;

/**
 * Evaluates controlled implementation activation for an explicit tenant/global scope.
 * Implementations may use local config or a feature-flag provider.
 *
 * This contract must not be used to make authorization or commercial entitlement decisions.
 */
@FunctionalInterface
public interface FeatureFlagPort {
    boolean isEnabled(FeatureFlagKey flag, TenantContext scope);
}
