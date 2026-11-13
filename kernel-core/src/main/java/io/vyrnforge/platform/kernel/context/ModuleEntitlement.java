package io.vyrnforge.platform.kernel.context;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Tenant-level product/module availability only; never a user/resource authorization decision. */
public record ModuleEntitlement(UUID tenantId, String moduleKey, boolean enabled, Instant effectiveAt) {
    public ModuleEntitlement {
        Objects.requireNonNull(tenantId, "tenantId");
        if (moduleKey == null || moduleKey.isBlank()) {
            throw new IllegalArgumentException("moduleKey must not be blank");
        }
    }
}
