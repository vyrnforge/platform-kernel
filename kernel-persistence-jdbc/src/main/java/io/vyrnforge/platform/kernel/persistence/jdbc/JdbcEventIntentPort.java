package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.event.EventIntentPort;

import javax.sql.DataSource;
import java.time.Clock;
import java.util.Objects;

public final class JdbcEventIntentPort implements EventIntentPort {
    private final JdbcReliabilityTransaction transactions;

    public JdbcEventIntentPort(
            DataSource dataSource,
            JacksonRecordCodec codec) {
        this(dataSource, codec, Clock.systemUTC());
    }

    public JdbcEventIntentPort(
            DataSource dataSource,
            JacksonRecordCodec codec,
            Clock clock) {
        this.transactions =
                new JdbcReliabilityTransaction(dataSource, codec, clock);
    }

    @Override
    public void accept(EventEnvelope<?> event) {
        Objects.requireNonNull(event, "event");
        transactions.execute((connection, events, audits) -> {
            events.accept(event);
            return null;
        });
    }
}
