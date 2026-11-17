package io.vyrnforge.platform.kernel.module;

import java.util.regex.Pattern;

/** Validation for module keys using the released v0.2 ModuleEntitlement wire grammar. */
public final class ModuleKeys {
    private static final int MAX_LENGTH = 128;
    private static final Pattern KEY = Pattern.compile("^[a-z][a-z0-9_.:-]*$");

    private ModuleKeys() {
    }

    public static String require(String moduleKey) {
        if (moduleKey == null || moduleKey.length() > MAX_LENGTH
                || !KEY.matcher(moduleKey).matches()) {
            throw new IllegalArgumentException(
                    "moduleKey must match the published module-key grammar (max 128 characters)");
        }
        return moduleKey;
    }
}
