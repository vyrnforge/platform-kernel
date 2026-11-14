package io.vyrnforge.platform.kernel.idempotency;

import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Opaque ownership token for one acquired idempotency execution.
 * Only the holder of the matching lease may complete or abort the execution.
 */
public record IdempotencyLease(
        UUID leaseId,
        UUID tenantId,
        String operation,
        String key,
        String requestFingerprint,
        Instant expiresAt) {

    public IdempotencyLease {
        Objects.requireNonNull(leaseId, "leaseId");
        Objects.requireNonNull(tenantId, "tenantId");
        if (!UuidV7.isCanonical(leaseId.toString())) {
            throw new IllegalArgumentException("leaseId must be UUIDv7");
        }
        if (!UuidV7.isCanonical(tenantId.toString())) {
            throw new IllegalArgumentException("tenantId must be UUIDv7");
        }
        if (operation == null || operation.isBlank()) {
            throw new IllegalArgumentException("operation must not be blank");
        }
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("key must not be blank");
        }
        if (requestFingerprint == null || requestFingerprint.isBlank()) {
            throw new IllegalArgumentException("requestFingerprint must not be blank");
        }
        Objects.requireNonNull(expiresAt, "expiresAt");
    }
}
