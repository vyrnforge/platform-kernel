package io.vyrnforge.platform.kernel.context;

import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.util.UUID;

/** Stable cross-domain resource reference. resourceId remains opaque to the kernel. */
public record ResourceReference(String resourceType, String resourceId, UUID tenantId) {
    public ResourceReference {
        if (resourceType == null || resourceType.length() > 128 || !resourceType.matches("^[a-z][a-z0-9_.:-]*$")) {
            throw new IllegalArgumentException("resourceType must be a valid namespaced key (max 128 characters)");
        }
        if (resourceId == null || resourceId.isBlank() || resourceId.codePointCount(0, resourceId.length()) > 512) {
            throw new IllegalArgumentException("resourceId must not be blank or exceed 512 characters");
        }
        if (tenantId != null && !UuidV7.isCanonical(tenantId.toString())) {
            throw new IllegalArgumentException("tenantId must be UUIDv7");
        }
    }
}
