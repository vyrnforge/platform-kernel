package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.audit.AuditIntentPort;
import io.vyrnforge.platform.kernel.context.ActorReference;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Objects;

final class JdbcAuditIntentWriter implements AuditIntentPort {
    private static final String SQL = """
        INSERT INTO platform_audit_event (
          audit_id,audit_fingerprint,occurred_at,tenant_id,
          actor_type,actor_id,identity_issuer,identity_subject,actor_display_name,
          action,resource_type,resource_id,resource_tenant_id,outcome,source,
          correlation_id,reason,changes_json
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb)
        ON CONFLICT (audit_id) DO UPDATE SET audit_id = EXCLUDED.audit_id
        WHERE platform_audit_event.audit_fingerprint = EXCLUDED.audit_fingerprint
        """;

    private final Connection connection;
    private final JacksonRecordCodec codec;

    JdbcAuditIntentWriter(Connection connection, JacksonRecordCodec codec) {
        this.connection = Objects.requireNonNull(connection, "connection");
        this.codec = Objects.requireNonNull(codec, "codec");
    }

    @Override
    public void accept(AuditEvent audit) {
        Objects.requireNonNull(audit, "audit");
        String changes = audit.changes()==null ? null : codec.encode(audit.changes());
        String fingerprint = SqlSupport.sha256(audit.toString() + "|" + changes);
        try (PreparedStatement ps = connection.prepareStatement(SQL)) {
            int i=1;
            ps.setObject(i++, audit.auditId());
            ps.setString(i++, fingerprint);
            ps.setTimestamp(i++, Timestamp.from(audit.occurredAt()));
            ps.setObject(i++, audit.tenantId());
            i = bindActor(ps, i, audit.actor());
            ps.setString(i++, audit.action());
            ps.setString(i++, audit.resource().resourceType());
            ps.setString(i++, audit.resource().resourceId());
            ps.setObject(i++, audit.resource().tenantId());
            ps.setString(i++, audit.outcome().name());
            ps.setString(i++, audit.source());
            ps.setObject(i++, audit.correlationId());
            ps.setString(i++, audit.reason());
            ps.setString(i, changes);
            int changed = ps.executeUpdate();
            if (changed == 0) throw new IllegalStateException("audit_id already exists with different content");
        } catch (SQLException e) {
            throw SqlSupport.failure("audit intent write", e);
        }
    }

    private int bindActor(PreparedStatement ps, int i, ActorReference actor) throws SQLException {
        if (actor == null) {
            for (int n=0;n<5;n++) ps.setString(i++, null);
            return i;
        }
        ps.setString(i++, actor.actorType().name());
        ps.setString(i++, actor.actorId());
        ps.setString(i++, actor.identity()==null?null:actor.identity().issuer());
        ps.setString(i++, actor.identity()==null?null:actor.identity().subject());
        ps.setString(i++, actor.displayName());
        return i;
    }
}
