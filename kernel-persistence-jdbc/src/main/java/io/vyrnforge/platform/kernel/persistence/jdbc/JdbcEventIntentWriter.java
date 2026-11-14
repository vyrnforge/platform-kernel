package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.event.EventIntentPort;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.Objects;

final class JdbcEventIntentWriter implements EventIntentPort {
    private static final String SQL = """
        INSERT INTO platform_event_outbox (
          event_id,event_fingerprint,event_type,event_version,occurred_at,tenant_id,
          producer,subject_type,subject_id,correlation_id,causation_id,
          actor_type,actor_id,identity_issuer,identity_subject,actor_display_name,
          payload_json,status,attempts,available_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb,'PENDING',0,?)
        ON CONFLICT (event_id) DO UPDATE SET event_id = EXCLUDED.event_id
        WHERE platform_event_outbox.event_fingerprint = EXCLUDED.event_fingerprint
        """;

    private final Connection connection;
    private final JacksonRecordCodec codec;
    private final Clock clock;

    JdbcEventIntentWriter(
            Connection connection,
            JacksonRecordCodec codec,
            Clock clock) {
        this.connection = Objects.requireNonNull(connection, "connection");
        this.codec = Objects.requireNonNull(codec, "codec");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public void accept(EventEnvelope<?> event) {
        Objects.requireNonNull(event, "event");
        String payload = codec.encode(event.payload());
        String fingerprint = fingerprint(event, payload);
        try (PreparedStatement ps = connection.prepareStatement(SQL)) {
            int i=1;
            ps.setObject(i++, event.eventId());
            ps.setString(i++, fingerprint);
            ps.setString(i++, event.eventType());
            ps.setInt(i++, event.eventVersion());
            ps.setTimestamp(i++, Timestamp.from(event.occurredAt()));
            ps.setObject(i++, event.tenantId());
            ps.setString(i++, event.producer());
            ps.setString(i++, event.subjectType());
            ps.setString(i++, event.subjectId());
            ps.setObject(i++, event.correlationId());
            ps.setObject(i++, event.causationId());
            i = bindActor(ps, i, event.actor());
            ps.setString(i++, payload);
            ps.setTimestamp(i, Timestamp.from(clock.instant()));
            int changed = ps.executeUpdate();
            if (changed == 0) {
                throw new IllegalStateException("event_id already exists with different content");
            }
        } catch (SQLException e) {
            throw SqlSupport.failure("event intent write", e);
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

    private String fingerprint(EventEnvelope<?> e, String payload) {
        return SqlSupport.sha256(String.join("|",
                e.eventId().toString(), e.eventType(), Integer.toString(e.eventVersion()),
                e.occurredAt().toString(), String.valueOf(e.tenantId()), e.producer(),
                e.subjectType(), e.subjectId(), e.correlationId().toString(),
                String.valueOf(e.causationId()), String.valueOf(e.actor()), payload));
    }
}
