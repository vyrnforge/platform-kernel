package io.vyrnforge.platform.kernel.idempotency;

import java.util.Objects;

public record IdempotencyDecision<R>(
        IdempotencyDecisionType type,
        IdempotencyLease lease,
        IdempotencyReplay<R> replay) {

    public IdempotencyDecision {
        Objects.requireNonNull(type, "type");

        switch (type) {
            case ACQUIRED -> {
                if (lease == null || replay != null) {
                    throw new IllegalArgumentException("ACQUIRED requires lease and no replay");
                }
            }
            case REPLAY -> {
                if (lease != null || replay == null) {
                    throw new IllegalArgumentException("REPLAY requires replay and no lease");
                }
            }
            case IN_PROGRESS, CONFLICT -> {
                if (lease != null || replay != null) {
                    throw new IllegalArgumentException(type + " must not expose lease or replay");
                }
            }
        }
    }

    public static <R> IdempotencyDecision<R> acquired(IdempotencyLease lease) {
        return new IdempotencyDecision<>(IdempotencyDecisionType.ACQUIRED, Objects.requireNonNull(lease), null);
    }

    public static <R> IdempotencyDecision<R> replay(IdempotencyReplay<R> replay) {
        return new IdempotencyDecision<>(IdempotencyDecisionType.REPLAY, null, Objects.requireNonNull(replay));
    }

    public static <R> IdempotencyDecision<R> inProgress() {
        return new IdempotencyDecision<>(IdempotencyDecisionType.IN_PROGRESS, null, null);
    }

    public static <R> IdempotencyDecision<R> conflict() {
        return new IdempotencyDecision<>(IdempotencyDecisionType.CONFLICT, null, null);
    }
}
