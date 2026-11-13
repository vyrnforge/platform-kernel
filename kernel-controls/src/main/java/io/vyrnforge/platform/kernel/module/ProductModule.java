package io.vyrnforge.platform.kernel.module;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Registered product/module identity.
 * Registration describes a known technical module; it does not grant tenant entitlement or user access.
 */
public record ProductModule(String moduleKey) {
    private static final Pattern MODULE_KEY =
            Pattern.compile("^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)*$");

    public ProductModule {
        Objects.requireNonNull(moduleKey, "moduleKey");
        if (!MODULE_KEY.matcher(moduleKey).matches()) {
            throw new IllegalArgumentException("moduleKey has invalid format");
        }
    }
}
