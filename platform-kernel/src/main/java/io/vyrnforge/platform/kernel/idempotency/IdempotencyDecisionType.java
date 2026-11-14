package io.vyrnforge.platform.kernel.idempotency;

public enum IdempotencyDecisionType {
    ACQUIRED,
    REPLAY,
    IN_PROGRESS,
    CONFLICT
}
