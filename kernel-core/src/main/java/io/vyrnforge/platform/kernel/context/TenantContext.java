package io.vyrnforge.platform.kernel.context;

import java.util.Objects;
import java.util.UUID;

/** Active tenant scope for an operation. Tenantless identity is explicit, never implicit. */
public record TenantContext(TenantScope scope, UUID tenantId) {
    public TenantContext {
        Objects.requireNonNull(scope, "scope");
        if (scope == TenantScope.TENANT && tenantId == null) {
            throw new IllegalArgumentException("tenantId is required for TENANT scope");
        }
        if (scope == TenantScope.NONE && tenantId != null) {
            throw new IllegalArgumentException("tenantId must be null for NONE scope");
        }
    }

    public static TenantContext tenant(UUID tenantId) {
        return new TenantContext(TenantScope.TENANT, Objects.requireNonNull(tenantId, "tenantId"));
    }

    public static TenantContext none() {
        return new TenantContext(TenantScope.NONE, null);
    }

    public boolean isTenantScoped() {
        return scope == TenantScope.TENANT;
    }
}
