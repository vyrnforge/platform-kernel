package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.event.EventEnvelope;

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
    }

    public OutboxPublishResult publishBatch(int limit) {
        if(limit<1) throw new IllegalArgumentException("limit");
        List<Claimed> claimed = claim(limit);
        int published=0,retried=0,dead=0;
        for(Claimed row:claimed){
            try {
                transport.publish(row.event);
                markPublished(row.event.eventId());
                published++;
            } catch(Exception failure) {
                if(row.attempts>=maxAttempts){ markDead(row.event.eventId(), failure); dead++; }
                else { release(row.event.eventId(), failure); retried++; }
            }
        }
        return new OutboxPublishResult(claimed.size(),published,retried,dead);
    }

    private List<Claimed> claim(int limit) {
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
                try(PreparedStatement up=c.prepareStatement("""
                    UPDATE platform_event_outbox SET locked_until=?,attempts=attempts+1 WHERE event_id=?
                    """)){
                    for(Claimed row:rows){
                        up.setTimestamp(1,Timestamp.from(lockedUntil)); up.setObject(2,row.event.eventId()); up.addBatch();
                    }
                    up.executeBatch();
                }
                c.commit();
                List<Claimed> adjusted=new ArrayList<>();
                for(Claimed row:rows) adjusted.add(new Claimed(row.event,row.attempts+1));
                return adjusted;
            } catch(SQLException | RuntimeException e) {
                c.rollback();
                throw e;
            }
        }catch(SQLException e){throw SqlSupport.failure("outbox claim",e);}
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
        return new Claimed(event,rs.getInt("attempts"));
    }

    private void markPublished(UUID id){ update(id,"PUBLISHED",null,clock.instant(),null); }
    private void markDead(UUID id,Exception e){ update(id,"DEAD",errorCode(e),null,null); }
    private void release(UUID id,Exception e){ update(id,"PENDING",errorCode(e),null,clock.instant().plus(retryDelay)); }

    private void update(UUID id,String status,String error,Instant publishedAt,Instant availableAt){
        try(Connection c=dataSource.getConnection(); PreparedStatement ps=c.prepareStatement("""
            UPDATE platform_event_outbox
            SET status=?,last_error_code=?,published_at=?,available_at=COALESCE(?,available_at),locked_until=NULL
            WHERE event_id=?
            """)){
            ps.setString(1,status); ps.setString(2,error);
            ps.setTimestamp(3,publishedAt==null?null:Timestamp.from(publishedAt));
            ps.setTimestamp(4,availableAt==null?null:Timestamp.from(availableAt));
            ps.setObject(5,id);
            if(ps.executeUpdate()!=1) throw new IllegalStateException("outbox row not found");
        }catch(SQLException e){throw SqlSupport.failure("outbox update",e);}
    }

    private String errorCode(Exception e){
        String n=e.getClass().getSimpleName();
        return n.length()>128?n.substring(0,128):n;
    }

    private record Claimed(EventEnvelope<Object> event,int attempts){}
}
