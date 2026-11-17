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
 *
 * WARNING: calling complete() after independently committing a durable business mutation
 * is not crash-atomic. For retriable mutations using the optional JDBC adapter, acquire
 * with begin() and call JdbcReliabilityTransaction.executeIdempotent(...) so the business
 * mutation, required event/audit intents and replay result commit in one transaction.
 * Reauthenticate and reauthorize the current caller before calling begin(), including
 * before replay; raw idempotency keys are not authorization grants.
 */
public interface IdempotencyPort<R> {
    IdempotencyDecision<R> begin(IdempotencyRequest request);

    void complete(IdempotencyLease lease, R result);

    void abort(IdempotencyLease lease);
}
