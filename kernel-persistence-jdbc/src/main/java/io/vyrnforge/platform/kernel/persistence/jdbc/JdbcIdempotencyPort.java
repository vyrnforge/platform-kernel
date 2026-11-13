package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.idempotency.*;
import io.vyrnforge.platform.kernel.ids.UuidV7;

import javax.sql.DataSource;
import java.sql.*;
import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

public final class JdbcIdempotencyPort<R> implements IdempotencyPort<R> {
    private final DataSource dataSource;
    private final IdempotencyResultCodec<R> codec;
    private final Clock clock;

    public JdbcIdempotencyPort(DataSource dataSource, IdempotencyResultCodec<R> codec) {
        this(dataSource, codec, Clock.systemUTC());
    }

    public JdbcIdempotencyPort(DataSource dataSource, IdempotencyResultCodec<R> codec, Clock clock) {
        this.dataSource = Objects.requireNonNull(dataSource, "dataSource");
        this.codec = Objects.requireNonNull(codec, "codec");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public IdempotencyDecision<R> begin(IdempotencyRequest request) {
        Objects.requireNonNull(request, "request");
        Instant now = clock.instant();
        if (!request.expiresAt().isAfter(now)) {
            throw new IllegalArgumentException("idempotency request expiration must be in the future");
        }

        try (Connection c = dataSource.getConnection()) {
            c.setAutoCommit(false);
            try {
                deleteExpired(c, request, now);
                java.util.UUID leaseId = UuidV7.generate();

                try (PreparedStatement ps = c.prepareStatement("""
                    INSERT INTO platform_idempotency
                      (tenant_id,operation,idempotency_key,request_fingerprint,lease_id,status,expires_at,updated_at)
                    VALUES (?,?,?,?,?,'IN_PROGRESS',?,?)
                    ON CONFLICT DO NOTHING
                    """)) {
                    ps.setObject(1, request.tenantId());
                    ps.setString(2, request.operation());
                    ps.setString(3, request.key());
                    ps.setString(4, request.requestFingerprint());
                    ps.setObject(5, leaseId);
                    ps.setTimestamp(6, Timestamp.from(request.expiresAt()));
                    ps.setTimestamp(7, Timestamp.from(now));
                    if (ps.executeUpdate() == 1) {
                        c.commit();
                        return IdempotencyDecision.acquired(new IdempotencyLease(
                                leaseId, request.tenantId(), request.operation(), request.key(),
                                request.requestFingerprint(), request.expiresAt()));
                    }
                }

                try (PreparedStatement ps = c.prepareStatement("""
                    SELECT request_fingerprint,lease_id,status,result_text,expires_at,completed_at
                    FROM platform_idempotency
                    WHERE tenant_id=? AND operation=? AND idempotency_key=?
                    FOR UPDATE
                    """)) {
                    ps.setObject(1, request.tenantId());
                    ps.setString(2, request.operation());
                    ps.setString(3, request.key());
                    try (ResultSet rs = ps.executeQuery()) {
                        if (!rs.next()) throw new IllegalStateException("idempotency row disappeared");
                        String fingerprint = rs.getString(1);
                        String status = rs.getString(3);
                        if (!fingerprint.equals(request.requestFingerprint())) {
                            c.commit();
                            return IdempotencyDecision.conflict();
                        }
                        if ("COMPLETED".equals(status)) {
                            String stored = rs.getString(4);
                            Timestamp completed = rs.getTimestamp(6);
                            c.commit();
                            return IdempotencyDecision.replay(new IdempotencyReplay<>(
                                    stored == null ? null : codec.decode(stored),
                                    completed.toInstant()));
                        }
                        c.commit();
                        return IdempotencyDecision.inProgress();
                    }
                }
            } catch (RuntimeException | SQLException e) {
                c.rollback();
                if (e instanceof RuntimeException r) throw r;
                throw SqlSupport.failure("idempotency begin", (SQLException)e);
            }
        } catch (SQLException e) {
            throw SqlSupport.failure("idempotency begin", e);
        }
    }

    @Override
    public void complete(IdempotencyLease lease, R result) {
        Objects.requireNonNull(lease, "lease");
        Instant now = clock.instant();
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("""
                 UPDATE platform_idempotency
                 SET status='COMPLETED', result_text=?, completed_at=?, updated_at=?
                 WHERE tenant_id=? AND operation=? AND idempotency_key=? AND lease_id=?
                   AND status='IN_PROGRESS' AND expires_at>?
                 """)) {
            ps.setString(1, result == null ? null : codec.encode(result));
            ps.setTimestamp(2, Timestamp.from(now));
            ps.setTimestamp(3, Timestamp.from(now));
            ps.setObject(4, lease.tenantId());
            ps.setString(5, lease.operation());
            ps.setString(6, lease.key());
            ps.setObject(7, lease.leaseId());
            ps.setTimestamp(8, Timestamp.from(now));
            if (ps.executeUpdate() != 1) throw new IllegalStateException("idempotency lease is not active");
        } catch (SQLException e) {
            throw SqlSupport.failure("idempotency complete", e);
        }
    }

    @Override
    public void abort(IdempotencyLease lease) {
        Objects.requireNonNull(lease, "lease");
        try (Connection c = dataSource.getConnection();
             PreparedStatement ps = c.prepareStatement("""
                 DELETE FROM platform_idempotency
                 WHERE tenant_id=? AND operation=? AND idempotency_key=? AND lease_id=? AND status='IN_PROGRESS'
                 """)) {
            ps.setObject(1, lease.tenantId());
            ps.setString(2, lease.operation());
            ps.setString(3, lease.key());
            ps.setObject(4, lease.leaseId());
            if (ps.executeUpdate() != 1) throw new IllegalStateException("idempotency lease is not active");
        } catch (SQLException e) {
            throw SqlSupport.failure("idempotency abort", e);
        }
    }

    private void deleteExpired(Connection c, IdempotencyRequest r, Instant now) throws SQLException {
        try (PreparedStatement ps = c.prepareStatement("""
            DELETE FROM platform_idempotency
            WHERE tenant_id=? AND operation=? AND idempotency_key=? AND expires_at<=?
            """)) {
            ps.setObject(1, r.tenantId());
            ps.setString(2, r.operation());
            ps.setString(3, r.key());
            ps.setTimestamp(4, Timestamp.from(now));
            ps.executeUpdate();
        }
    }
}
