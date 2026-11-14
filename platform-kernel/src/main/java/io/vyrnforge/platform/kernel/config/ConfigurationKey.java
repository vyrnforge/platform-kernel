package io.vyrnforge.platform.kernel.config;

import io.vyrnforge.platform.kernel.controls.NamespacedKey;

/**
 * Stable namespaced non-secret configuration key, for example platform.locale.default or asset.import.max-batch-size.
 */
public record ConfigurationKey(String value) {
    public ConfigurationKey {
        value = NamespacedKey.require(value, "configuration key");
    }

    public String namespace() {
        return NamespacedKey.namespace(value);
    }
}
