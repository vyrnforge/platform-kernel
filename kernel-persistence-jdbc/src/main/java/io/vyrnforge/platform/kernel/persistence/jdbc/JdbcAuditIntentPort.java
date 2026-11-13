package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.audit.AuditIntentPort;

import javax.sql.DataSource;
import java.util.Objects;

public final class JdbcAuditIntentPort implements AuditIntentPort {
    private final JdbcReliabilityTransaction transactions;

    public JdbcAuditIntentPort(DataSource dataSource, JacksonRecordCodec codec) {
        this.transactions = new JdbcReliabilityTransaction(dataSource, codec);
    }

    @Override
    public void accept(AuditEvent auditEvent) {
        Objects.requireNonNull(auditEvent, "auditEvent");
        transactions.execute((connection, events, audits) -> {
            audits.accept(auditEvent);
            return null;
        });
    }
}
