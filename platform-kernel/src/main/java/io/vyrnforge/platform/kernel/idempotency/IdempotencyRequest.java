package io.vyrnforge.platform.kernel.idempotency;

import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Tenant-scoped idempotency request for retriable API mutations.
 * requestFingerprint is opaque to the kernel; callers define a stable representation of request semantics.
 */
public record IdempotencyRequest(
        UUID tenantId,
        String operation,
        String key,
        String requestFingerprint,
        Instant expiresAt) {

    private static final Pattern OPERATION =
            Pattern.compile("^[a-z][a-z0-9_.:-]*$");

    public IdempotencyRequest {
        Objects.requireNonNull(tenantId, "tenantId");
        if (!UuidV7.isCanonical(tenantId.toString())) {
            throw new IllegalArgumentException("tenantId must be UUIDv7");
        }
        operation = requireText(operation, "operation");
        if (!OPERATION.matcher(operation).matches()) {
            throw new IllegalArgumentException("operation has invalid format");
        }
        key = requireText(key, "key");
        requestFingerprint = requireText(requestFingerprint, "requestFingerprint");
        Objects.requireNonNull(expiresAt, "expiresAt");
    }

    private static String requireText(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
