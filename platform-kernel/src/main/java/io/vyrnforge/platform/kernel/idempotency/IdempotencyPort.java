package io.vyrnforge.platform.kernel.idempotency;

/**
 * Atomic tenant-scoped idempotency boundary for retriable API mutations.
 *
 * begin() must atomically classify a key as:
 * - ACQUIRED: this caller owns execution via the returned lease;
 * - REPLAY: the same request fingerprint completed previously;
 * - IN_PROGRESS: the same request fingerprint is currently executing;
 * - CONFLICT: the key was reused with different request semantics.
 *
 * Expired records may be discarded and reacquired. Implementations own physical storage and locking.
 */
public interface IdempotencyPort<R> {
    IdempotencyDecision<R> begin(IdempotencyRequest request);

    void complete(IdempotencyLease lease, R result);

    void abort(IdempotencyLease lease);
}
