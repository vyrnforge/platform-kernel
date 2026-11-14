package io.vyrnforge.platform.kernel.controls;

import java.util.Objects;
import java.util.regex.Pattern;

/** Shared validation for stable namespaced feature/configuration keys. */
public final class NamespacedKey {
    private static final Pattern KEY =
            Pattern.compile("^[a-z][a-z0-9-]*(?:\\.[a-z][a-z0-9-]*)+$");

    private NamespacedKey() {
    }

    public static String require(String value, String name) {
        Objects.requireNonNull(value, name);
        if (!KEY.matcher(value).matches()) {
            throw new IllegalArgumentException(
                    name + " must be a lowercase namespaced key such as asset.feature-name");
        }
        return value;
    }

    public static String namespace(String value) {
        String validated = require(value, "namespaced key");
        return validated.substring(0, validated.indexOf('.'));
    }
}
