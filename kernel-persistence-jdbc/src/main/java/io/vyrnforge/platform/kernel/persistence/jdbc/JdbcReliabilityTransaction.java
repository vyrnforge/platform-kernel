package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.audit.AuditIntentPort;
import io.vyrnforge.platform.kernel.event.EventIntentPort;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.Objects;

public final class JdbcReliabilityTransaction {
    private final DataSource dataSource;
    private final JacksonRecordCodec codec;

    public JdbcReliabilityTransaction(DataSource dataSource, JacksonRecordCodec codec) {
        this.dataSource = Objects.requireNonNull(dataSource, "dataSource");
        this.codec = Objects.requireNonNull(codec, "codec");
    }

    public <T> T execute(Work<T> work) {
        Objects.requireNonNull(work, "work");
        try (Connection connection = dataSource.getConnection()) {
            boolean previousAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                EventIntentPort events = new JdbcEventIntentWriter(connection, codec);
                AuditIntentPort audits = new JdbcAuditIntentWriter(connection, codec);
                T result = work.execute(connection, events, audits);
                connection.commit();
                return result;
            } catch (Exception e) {
                connection.rollback();
                if (e instanceof RuntimeException runtime) throw runtime;
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
        T execute(Connection connection, EventIntentPort events, AuditIntentPort audits) throws Exception;
    }
}
