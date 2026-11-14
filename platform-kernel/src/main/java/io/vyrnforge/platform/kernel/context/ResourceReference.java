package io.vyrnforge.platform.kernel.context;

import java.util.UUID;

/** Stable cross-domain resource reference. resourceId remains opaque to the kernel. */
public record ResourceReference(String resourceType, String resourceId, UUID tenantId) {
    public ResourceReference {
        if (resourceType == null || resourceType.isBlank()) {
            throw new IllegalArgumentException("resourceType must not be blank");
        }
        if (resourceId == null || resourceId.isBlank()) {
            throw new IllegalArgumentException("resourceId must not be blank");
        }
    }
}
