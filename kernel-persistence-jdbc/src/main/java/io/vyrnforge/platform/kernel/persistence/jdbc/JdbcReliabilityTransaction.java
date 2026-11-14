package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.audit.AuditIntentPort;
import io.vyrnforge.platform.kernel.event.EventIntentPort;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyLease;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.Instant;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Clock;
import java.util.Objects;

public final class JdbcReliabilityTransaction {
    private final DataSource dataSource;
    private final JacksonRecordCodec codec;
    private final Clock clock;

    public JdbcReliabilityTransaction(
            DataSource dataSource,
            JacksonRecordCodec codec) {
        this(dataSource, codec, Clock.systemUTC());
    }

    public JdbcReliabilityTransaction(
            DataSource dataSource,
            JacksonRecordCodec codec,
            Clock clock) {
        this.dataSource = Objects.requireNonNull(dataSource, "dataSource");
        this.codec = Objects.requireNonNull(codec, "codec");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    public <T> T execute(Work<T> work) {
        Objects.requireNonNull(work, "work");
        try (Connection connection = dataSource.getConnection()) {
            connection.setAutoCommit(false);
            try {
                EventIntentPort events =
                        new JdbcEventIntentWriter(connection, codec, clock);
                AuditIntentPort audits =
                        new JdbcAuditIntentWriter(connection, codec);
                T result = work.execute(connection, events, audits);
                connection.commit();
                return result;
            } catch (Exception | Error e) {
                try {
                    connection.rollback();
                } catch (SQLException rollbackFailure) {
                    e.addSuppressed(rollbackFailure);
                    // Never restore auto-commit after a failed rollback: doing so can commit
                    // partially executed work. The connection is closed by try-with-resources.
                    if (e instanceof Error error) throw error;
                    if (e instanceof RuntimeException runtime) throw runtime;
                    throw new IllegalStateException("transaction rollback failed", e);
                }
                if (e instanceof Error error) throw error;
                if (e instanceof RuntimeException runtime) throw runtime;
                throw new IllegalStateException("transaction work failed", e);
            }
        } catch (SQLException e) {
            throw SqlSupport.failure("transaction", e);
        }
    }

    /**
     * Commit domain data, audit/event intent and the acquired idempotency result together.
     * The caller must use begin() on the same database before invoking this method.
     * Work must use the supplied connection and must not commit or perform external side effects.
     * Retain the key for the full retry window; after expiration re-execution is permitted.
     */
    public <T> T executeIdempotent(IdempotencyLease lease, IdempotencyResultCodec<T> resultCodec,
                                  Work<T> work) {
        Objects.requireNonNull(lease, "lease");
        Objects.requireNonNull(resultCodec, "resultCodec");
        Objects.requireNonNull(work, "work");
        return execute((connection, events, audits) -> {
            // Lock the exact active lease before running domain code. Reacquisition and abort
            // cannot replace it while the database transaction is in progress.
            try (PreparedStatement ps = connection.prepareStatement("""
                SELECT expires_at FROM platform_idempotency
                WHERE tenant_id=? AND operation=? AND idempotency_key=? AND lease_id=?
                  AND request_fingerprint=? AND status='IN_PROGRESS'
                FOR UPDATE
                """)) {
                bindLease(ps, lease, 1);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next() || !rs.getTimestamp(1).toInstant().isAfter(clock.instant())) {
                        throw new IllegalStateException("idempotency lease is not active");
                    }
                }
            }
            T result = work.execute(connection, events, audits);
            Instant now = clock.instant();
            try (PreparedStatement ps = connection.prepareStatement("""
                UPDATE platform_idempotency
                SET status='COMPLETED', result_text=?, completed_at=?, updated_at=?
                WHERE tenant_id=? AND operation=? AND idempotency_key=? AND lease_id=?
                  AND request_fingerprint=? AND status='IN_PROGRESS' AND expires_at>?
                """)) {
                ps.setString(1, result == null ? null : resultCodec.encode(result));
                ps.setTimestamp(2, Timestamp.from(now));
                ps.setTimestamp(3, Timestamp.from(now));
                bindLease(ps, lease, 4);
                ps.setTimestamp(9, Timestamp.from(now));
                if (ps.executeUpdate() != 1) {
                    throw new IllegalStateException("idempotency lease is not active");
                }
            }
            return result;
        });
    }

    private static void bindLease(PreparedStatement ps, IdempotencyLease lease, int offset)
            throws SQLException {
        ps.setObject(offset, lease.tenantId());
        ps.setString(offset + 1, lease.operation());
        ps.setString(offset + 2, lease.key());
        ps.setObject(offset + 3, lease.leaseId());
        ps.setString(offset + 4, lease.requestFingerprint());
    }

    @FunctionalInterface
    public interface Work<T> {
        T execute(
                Connection connection,
                EventIntentPort events,
                AuditIntentPort audits) throws Exception;
    }
}
