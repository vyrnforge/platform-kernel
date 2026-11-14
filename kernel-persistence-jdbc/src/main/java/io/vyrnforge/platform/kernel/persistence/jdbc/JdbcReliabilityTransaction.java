package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.audit.AuditIntentPort;
import io.vyrnforge.platform.kernel.event.EventIntentPort;

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
            boolean previousAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                EventIntentPort events =
                        new JdbcEventIntentWriter(connection, codec, clock);
                AuditIntentPort audits =
                        new JdbcAuditIntentWriter(connection, codec);
                T result = work.execute(connection, events, audits);
                connection.commit();
                return result;
            } catch (Exception e) {
                connection.rollback();
                if (e instanceof RuntimeException runtime) {
                    throw runtime;
                }
                throw new IllegalStateException("transaction work failed", e);
            } finally {
                connection.setAutoCommit(previousAutoCommit);
            }
        } catch (SQLException e) {
            throw SqlSupport.failure("transaction", e);
        }
    }

    @FunctionalInterface
    public interface Work<T> {
        T execute(
                Connection connection,
                EventIntentPort events,
                AuditIntentPort audits) throws Exception;
    }
}
