package io.vyrnforge.platform.kernel.idempotency;

import java.time.Instant;
import java.util.Objects;

/** Previously completed result for a matching idempotency key + request fingerprint. */
public record IdempotencyReplay<R>(R result, Instant completedAt) {
    public IdempotencyReplay {
        Objects.requireNonNull(completedAt, "completedAt");
    }
}
