package io.vyrnforge.platform.kernel.module;

import java.util.List;
import java.util.Optional;

/**
 * Read-only registry of known product/modules.
 * Tenant enablement belongs to ModuleEntitlementPort, not this registry.
 */
public interface ProductModuleRegistry {
    Optional<ProductModule> find(String moduleKey);

    List<ProductModule> modules();

    default boolean contains(String moduleKey) {
        return find(moduleKey).isPresent();
    }

    default ProductModule require(String moduleKey) {
        return find(moduleKey).orElseThrow(
                () -> new IllegalArgumentException("Unknown product module: " + moduleKey));
    }
}
