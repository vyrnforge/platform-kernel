package io.vyrnforge.platform.kernel.context;

import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Effective tenant-level product/module availability only; never a user/resource authorization decision. */
public record ModuleEntitlement(UUID tenantId, String moduleKey, boolean enabled, Instant effectiveAt) {
    public ModuleEntitlement {
        Objects.requireNonNull(tenantId, "tenantId");
        if (!UuidV7.isCanonical(tenantId.toString())) {
            throw new IllegalArgumentException("tenantId must be UUIDv7");
        }
        if (moduleKey == null || moduleKey.length() > 128 || !moduleKey.matches("^[a-z][a-z0-9_.:-]*$")) {
            throw new IllegalArgumentException("moduleKey must be a valid namespaced key (max 128 characters)");
        }
    }
}
