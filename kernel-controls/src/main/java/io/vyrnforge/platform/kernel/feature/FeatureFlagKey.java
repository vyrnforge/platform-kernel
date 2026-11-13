package io.vyrnforge.platform.kernel.feature;

import io.vyrnforge.platform.kernel.controls.NamespacedKey;

/**
 * Stable namespaced implementation feature key, for example asset.bulk-import-v2.
 * A feature flag is not a tenant entitlement or user authorization permission.
 */
public record FeatureFlagKey(String value) {
    public FeatureFlagKey {
        value = NamespacedKey.require(value, "feature flag key");
    }

    public String namespace() {
        return NamespacedKey.namespace(value);
    }
}
