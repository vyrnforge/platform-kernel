package io.vyrnforge.platform.kernel.module;

/**
 * Registered product/module identity.
 * Registration describes a known technical module; it does not grant tenant entitlement or user access.
 */
public record ProductModule(String moduleKey) {
    public ProductModule {
        moduleKey = ModuleKeys.require(moduleKey);
    }
}
