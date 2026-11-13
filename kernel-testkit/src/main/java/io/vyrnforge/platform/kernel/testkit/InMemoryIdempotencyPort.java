package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.idempotency.IdempotencyDecision;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyLease;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyPort;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyReplay;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyRequest;
import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Thread-safe in-memory implementation of the idempotency contract for consumer tests.
 * Not suitable for production durability or multi-process coordination.
 */
public final class InMemoryIdempotencyPort<R> implements IdempotencyPort<R> {
    private final Clock clock;
    private final Supplier<UUID> leaseIdSupplier;
    private final Map<Key, Entry<R>> entries = new HashMap<>();

    public InMemoryIdempotencyPort() {
        this(Clock.systemUTC(), UuidV7::generate);
    }

    public InMemoryIdempotencyPort(Clock clock, Supplier<UUID> leaseIdSupplier) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.leaseIdSupplier = Objects.requireNonNull(leaseIdSupplier, "leaseIdSupplier");
    }

    @Override
    public synchronized IdempotencyDecision<R> begin(IdempotencyRequest request) {
        Objects.requireNonNull(request, "request");
        Instant now = clock.instant();
        if (!request.expiresAt().isAfter(now)) {
            throw new IllegalArgumentException("idempotency request expiration must be in the future");
        }

        Key key = new Key(request.tenantId(), request.operation(), request.key());
        Entry<R> existing = entries.get(key);

        if (existing != null && !existing.expiresAt.isAfter(now)) {
            entries.remove(key);
            existing = null;
        }

        if (existing == null) {
            UUID leaseId = Objects.requireNonNull(leaseIdSupplier.get(), "leaseIdSupplier returned null");
            IdempotencyLease lease = new IdempotencyLease(
                    leaseId,
                    request.tenantId(),
                    request.operation(),
                    request.key(),
                    request.requestFingerprint(),
                    request.expiresAt());
            entries.put(key, Entry.inProgress(
                    request.requestFingerprint(),
                    request.expiresAt(),
                    leaseId));
            return IdempotencyDecision.acquired(lease);
        }

        if (!existing.requestFingerprint.equals(request.requestFingerprint())) {
            return IdempotencyDecision.conflict();
        }

        if (existing.completed) {
            return IdempotencyDecision.replay(
                    new IdempotencyReplay<>(existing.result, existing.completedAt));
        }

        return IdempotencyDecision.inProgress();
    }

    @Override
    public synchronized void complete(IdempotencyLease lease, R result) {
        Objects.requireNonNull(lease, "lease");
        Instant now = clock.instant();
        Key key = new Key(lease.tenantId(), lease.operation(), lease.key());
        Entry<R> existing = entries.get(key);

        requireActiveLease(existing, lease, now);
        if (existing.completed) {
            throw new IllegalStateException("idempotency execution is already completed");
        }

        existing.completed = true;
        existing.result = result;
        existing.completedAt = now;
    }

    @Override
    public synchronized void abort(IdempotencyLease lease) {
        Objects.requireNonNull(lease, "lease");
        Instant now = clock.instant();
        Key key = new Key(lease.tenantId(), lease.operation(), lease.key());
        Entry<R> existing = entries.get(key);

        requireActiveLease(existing, lease, now);
        if (existing.completed) {
            throw new IllegalStateException("completed idempotency execution cannot be aborted");
        }
        entries.remove(key);
    }

    private void requireActiveLease(Entry<R> existing, IdempotencyLease lease, Instant now) {
        if (existing == null) {
            throw new IllegalStateException("idempotency lease is not active");
        }
        if (!existing.expiresAt.isAfter(now)) {
            entries.remove(new Key(lease.tenantId(), lease.operation(), lease.key()));
            throw new IllegalStateException("idempotency lease has expired");
        }
        if (!existing.leaseId.equals(lease.leaseId())
                || !existing.requestFingerprint.equals(lease.requestFingerprint())
                || !existing.expiresAt.equals(lease.expiresAt())) {
            throw new IllegalStateException("idempotency lease does not own this execution");
        }
    }

    private record Key(UUID tenantId, String operation, String key) {
    }

    private static final class Entry<R> {
        private final String requestFingerprint;
        private final Instant expiresAt;
        private final UUID leaseId;
        private boolean completed;
        private R result;
        private Instant completedAt;

        private Entry(String requestFingerprint, Instant expiresAt, UUID leaseId) {
            this.requestFingerprint = requestFingerprint;
            this.expiresAt = expiresAt;
            this.leaseId = leaseId;
        }

        private static <R> Entry<R> inProgress(
                String requestFingerprint,
                Instant expiresAt,
                UUID leaseId) {
            return new Entry<>(requestFingerprint, expiresAt, leaseId);
        }
    }
}
