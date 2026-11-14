package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.ids.UuidV7;

import javax.sql.DataSource;
import java.sql.*;
import java.time.*;
import java.util.*;

public final class JdbcOutboxPublisher {
    private final DataSource dataSource;
    private final JacksonRecordCodec codec;
    private final EventTransport transport;
    private final Clock clock;
    private final int maxAttempts;
    private final Duration retryDelay;
    private final Duration leaseDuration;

    public JdbcOutboxPublisher(DataSource dataSource, JacksonRecordCodec codec, EventTransport transport,
                               int maxAttempts, Duration retryDelay, Duration leaseDuration) {
        this(dataSource, codec, transport, Clock.systemUTC(), maxAttempts, retryDelay, leaseDuration);
    }

    public JdbcOutboxPublisher(DataSource dataSource, JacksonRecordCodec codec, EventTransport transport,
                               Clock clock, int maxAttempts, Duration retryDelay, Duration leaseDuration) {
        this.dataSource=Objects.requireNonNull(dataSource);
        this.codec=Objects.requireNonNull(codec);
        this.transport=Objects.requireNonNull(transport);
        this.clock=Objects.requireNonNull(clock);
        if(maxAttempts<1) throw new IllegalArgumentException("maxAttempts");
        this.maxAttempts=maxAttempts;
        this.retryDelay=Objects.requireNonNull(retryDelay);
        this.leaseDuration=Objects.requireNonNull(leaseDuration);
        if (retryDelay.isNegative()) throw new IllegalArgumentException("retryDelay");
        if (leaseDuration.isZero() || leaseDuration.isNegative()) throw new IllegalArgumentException("leaseDuration");
    }

    public OutboxPublishResult publishBatch(int limit) {
        if(limit<1) throw new IllegalArgumentException("limit");
        ClaimBatch batch = claim(limit);
        int published=0,retried=0,dead=batch.exhausted();
        for (Claimed row : batch.rows()) {
            // A batch can outlive its lease while earlier events are delivered.
            if (!stillOwned(row)) continue;
            Exception transportFailure = null;
            try {
                transport.publish(row.event);
            } catch (Exception failure) {
                transportFailure = failure;
            }
            // Keep transport failures separate from DB update failures. A successful external
            // send followed by a DB failure remains uncertain and is recovered at-least-once.
            if (transportFailure == null) {
                if (update(row, "PUBLISHED", null, clock.instant(), null)) published++;
            } else if (row.attempts >= maxAttempts) {
                if (update(row, "DEAD", errorCode(transportFailure), null, null)) dead++;
            } else {
                if (update(row, "PENDING", errorCode(transportFailure), null,
                        clock.instant().plus(retryDelay))) retried++;
            }
        }
        return new OutboxPublishResult(batch.rows().size()+batch.exhausted(),published,retried,dead);
    }

    private ClaimBatch claim(int limit) {
        Instant now=clock.instant(), lockedUntil=now.plus(leaseDuration);
        try(Connection c=dataSource.getConnection()){
            c.setAutoCommit(false);
            try {
                List<Claimed> rows=new ArrayList<>();
                try(PreparedStatement ps=c.prepareStatement("""
                    SELECT event_id,event_type,event_version,occurred_at,tenant_id,producer,subject_type,subject_id,
                           correlation_id,causation_id,actor_type,actor_id,identity_issuer,identity_subject,
                           actor_display_name,payload_json::text,attempts
                    FROM platform_event_outbox
                    WHERE status='PENDING' AND available_at<=? AND (locked_until IS NULL OR locked_until<=?)
                    ORDER BY occurred_at,event_id
                    FOR UPDATE SKIP LOCKED LIMIT ?
                    """)){
                    ps.setTimestamp(1,Timestamp.from(now)); ps.setTimestamp(2,Timestamp.from(now)); ps.setInt(3,limit);
                    try(ResultSet rs=ps.executeQuery()){
                        while(rs.next()) rows.add(read(rs));
                    }
                }
                List<Claimed> adjusted=new ArrayList<>();
                int exhausted=0;
                try(PreparedStatement up=c.prepareStatement("""
                    UPDATE platform_event_outbox SET locked_until=?,claim_token=?,attempts=attempts+1
                    WHERE event_id=?
                    """);
                    PreparedStatement terminal=c.prepareStatement("""
                    UPDATE platform_event_outbox
                    SET status='DEAD',last_error_code='ATTEMPTS_EXHAUSTED',locked_until=NULL,claim_token=NULL
                    WHERE event_id=?
                    """)){
                    for(Claimed row:rows){
                        if(row.attempts>=maxAttempts){
                            terminal.setObject(1,row.event.eventId());
                            terminal.executeUpdate();
                            exhausted++;
                        } else {
                            UUID token=UuidV7.generate();
                            up.setTimestamp(1,Timestamp.from(lockedUntil)); up.setObject(2,token);
                            up.setObject(3,row.event.eventId()); up.executeUpdate();
                            adjusted.add(new Claimed(row.event,row.attempts+1,token));
                        }
                    }
                }
                c.commit();
                return new ClaimBatch(adjusted,exhausted);
            } catch(SQLException | RuntimeException e) {
                c.rollback();
                throw e;
            }
        }catch(SQLException e){throw SqlSupport.failure("outbox claim",e);}
    }

    private boolean stillOwned(Claimed row) {
        try(Connection c=dataSource.getConnection(); PreparedStatement ps=c.prepareStatement("""
            SELECT 1 FROM platform_event_outbox
            WHERE event_id=? AND claim_token=? AND status='PENDING' AND locked_until>?
            """)){
            ps.setObject(1,row.event.eventId()); ps.setObject(2,row.token);
            ps.setTimestamp(3,Timestamp.from(clock.instant()));
            try(ResultSet rs=ps.executeQuery()){return rs.next();}
        }catch(SQLException e){throw SqlSupport.failure("outbox ownership",e);}
    }

    private Claimed read(ResultSet rs)throws SQLException{
        ActorReference actor=null;
        String actorType=rs.getString("actor_type");
        if(actorType!=null){
            IdentityReference identity=null;
            String issuer=rs.getString("identity_issuer");
            String subject=rs.getString("identity_subject");
            if(issuer!=null&&subject!=null) identity=new IdentityReference(issuer,subject);
            actor=new ActorReference(ActorType.valueOf(actorType),rs.getString("actor_id"),identity,rs.getString("actor_display_name"));
        }
        EventEnvelope<Object> event=new EventEnvelope<>(
                (UUID)rs.getObject("event_id"),rs.getString("event_type"),rs.getInt("event_version"),
                rs.getTimestamp("occurred_at").toInstant(),(UUID)rs.getObject("tenant_id"),rs.getString("producer"),
                rs.getString("subject_type"),rs.getString("subject_id"),(UUID)rs.getObject("correlation_id"),
                (UUID)rs.getObject("causation_id"),actor,codec.decode(rs.getString("payload_json")));
        return new Claimed(event,rs.getInt("attempts"),null);
    }

    private boolean update(Claimed row,String status,String error,Instant publishedAt,Instant availableAt){
        try(Connection c=dataSource.getConnection(); PreparedStatement ps=c.prepareStatement("""
            UPDATE platform_event_outbox
            SET status=?,last_error_code=?,published_at=?,available_at=COALESCE(?,available_at),
                locked_until=NULL,claim_token=NULL
            WHERE event_id=? AND claim_token=? AND status='PENDING' AND locked_until>?
            """)){
            ps.setString(1,status); ps.setString(2,error);
            ps.setTimestamp(3,publishedAt==null?null:Timestamp.from(publishedAt));
            ps.setTimestamp(4,availableAt==null?null:Timestamp.from(availableAt));
            ps.setObject(5,row.event.eventId()); ps.setObject(6,row.token);
            ps.setTimestamp(7,Timestamp.from(clock.instant()));
            return ps.executeUpdate()==1;
        }catch(SQLException e){throw SqlSupport.failure("outbox update",e);}
    }

    private String errorCode(Exception e){
        String n=e.getClass().getSimpleName();
        return n.length()>128?n.substring(0,128):n;
    }

    private record Claimed(EventEnvelope<Object> event,int attempts,UUID token){}
    private record ClaimBatch(List<Claimed> rows,int exhausted){}
}
