package io.vyrnforge.platform.kernel.persistence.jdbc;

import io.vyrnforge.platform.kernel.audit.*;
import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.idempotency.*;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.*;

class JdbcReliabilityIntegrationTest {
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("kernel")
                    .withUsername("kernel")
                    .withPassword("kernel");
    private static DataSource dataSource;
    private static final UUID TENANT=UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION=UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");

    @BeforeAll static void start() throws Exception {
        POSTGRES.start();
        dataSource=new DriverManagerDataSource(POSTGRES.getJdbcUrl(),POSTGRES.getUsername(),POSTGRES.getPassword());
        KernelJdbcMigrator.migrate(dataSource);
        try(Connection c=dataSource.getConnection(); Statement s=c.createStatement()){
            s.execute("CREATE TABLE asset_reference (id UUID PRIMARY KEY, tenant_id UUID NOT NULL, label TEXT NOT NULL)");
        }
    }

    @AfterAll static void stop(){ POSTGRES.stop(); }

    @BeforeEach void clean() throws Exception {
        try(Connection c=dataSource.getConnection(); Statement s=c.createStatement()){
            s.execute("TRUNCATE asset_reference, platform_event_outbox, platform_audit_event, platform_idempotency");
        }
    }

    @Test void domainMutationAuditAndOutboxCommitAtomically() throws Exception {
        JacksonRecordCodec codec=new JacksonRecordCodec();
        JdbcReliabilityTransaction tx=new JdbcReliabilityTransaction(dataSource,codec);
        UUID assetId=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");

        tx.execute((connection,events,audits)->{
            try(PreparedStatement ps=connection.prepareStatement("INSERT INTO asset_reference VALUES (?,?,?)")){
                ps.setObject(1,assetId); ps.setObject(2,TENANT); ps.setString(3,"Laptop"); ps.executeUpdate();
            }
            events.accept(event(assetId,Map.of("label","Laptop")));
            audits.accept(audit(assetId));
            return null;
        });

        assertEquals(1,count("asset_reference"));
        assertEquals(1,count("platform_event_outbox"));
        assertEquals(1,count("platform_audit_event"));
    }

    @Test void rollbackRemovesDomainMutationAuditAndOutboxTogether() {
        JacksonRecordCodec codec=new JacksonRecordCodec();
        JdbcReliabilityTransaction tx=new JdbcReliabilityTransaction(dataSource,codec);
        UUID assetId=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");

        assertThrows(IllegalStateException.class,()->tx.execute((connection,events,audits)->{
            try(PreparedStatement ps=connection.prepareStatement("INSERT INTO asset_reference VALUES (?,?,?)")){
                ps.setObject(1,assetId); ps.setObject(2,TENANT); ps.setString(3,"Laptop"); ps.executeUpdate();
            }
            events.accept(event(assetId,Map.of("label","Laptop")));
            audits.accept(audit(assetId));
            throw new IllegalStateException("simulate-domain-failure");
        }));

        assertEquals(0,countUnchecked("asset_reference"));
        assertEquals(0,countUnchecked("platform_event_outbox"));
        assertEquals(0,countUnchecked("platform_audit_event"));
    }

    @Test void auditDuplicateFingerprintIsStableAcrossMapInsertionOrder() {
        JacksonRecordCodec codec = new JacksonRecordCodec();
        UUID assetId = UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");

        LinkedHashMap<String,Object> firstChanges = new LinkedHashMap<>();
        firstChanges.put("label", "Laptop");
        firstChanges.put("owner", "actor-1");

        LinkedHashMap<String,Object> secondChanges = new LinkedHashMap<>();
        secondChanges.put("owner", "actor-1");
        secondChanges.put("label", "Laptop");

        new JdbcAuditIntentPort(dataSource, codec).accept(audit(assetId, firstChanges));
        assertDoesNotThrow(() ->
                new JdbcAuditIntentPort(dataSource, codec).accept(audit(assetId, secondChanges)));

        assertEquals(1, countUnchecked("platform_audit_event"));
    }

    @Test void auditRowsRejectOrdinaryUpdateAndDelete() {
        JacksonRecordCodec codec = new JacksonRecordCodec();
        UUID assetId = UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcAuditIntentPort(dataSource, codec).accept(audit(assetId));

        assertThrows(SQLException.class, () -> {
            try (Connection c = dataSource.getConnection();
                 Statement s = c.createStatement()) {
                s.executeUpdate("UPDATE platform_audit_event SET source='tampered'");
            }
        });

        assertThrows(SQLException.class, () -> {
            try (Connection c = dataSource.getConnection();
                 Statement s = c.createStatement()) {
                s.executeUpdate("DELETE FROM platform_audit_event");
            }
        });

        assertEquals(1, countUnchecked("platform_audit_event"));
    }

    @Test void persistedIdempotencyReplaysAcrossPortInstances() {
        Instant now=Instant.parse("2026-11-13T15:00:00Z");
        Clock clock=Clock.fixed(now,ZoneOffset.UTC);
        IdempotencyRequest request=new IdempotencyRequest(
                TENANT,"asset.create","client-key","fp-1",now.plusSeconds(300));

        JdbcIdempotencyPort<String> first=new JdbcIdempotencyPort<>(dataSource,IdempotencyResultCodec.strings(),clock);
        var acquired=first.begin(request);
        assertEquals(IdempotencyDecisionType.ACQUIRED,acquired.type());
        first.complete(acquired.lease(),"asset-123");

        JdbcIdempotencyPort<String> restarted=new JdbcIdempotencyPort<>(dataSource,IdempotencyResultCodec.strings(),clock);
        var replay=restarted.begin(request);
        assertEquals(IdempotencyDecisionType.REPLAY,replay.type());
        assertEquals("asset-123",replay.replay().result());

        var conflict=restarted.begin(new IdempotencyRequest(
                TENANT,"asset.create","client-key","different",now.plusSeconds(300)));
        assertEquals(IdempotencyDecisionType.CONFLICT,conflict.type());
    }

    @Test void outboxRetriesThenPublishesWithoutDuplicatingIntent() throws Exception {
        JacksonRecordCodec codec=new JacksonRecordCodec();
        UUID assetId=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcEventIntentPort(dataSource,codec).accept(event(assetId,Map.of("label","Laptop")));

        AtomicInteger calls=new AtomicInteger();
        EventTransport transport=e->{ if(calls.incrementAndGet()==1) throw new SQLException("temporary"); };
        MutableClock clock=new MutableClock(Instant.now());
        JdbcOutboxPublisher publisher=new JdbcOutboxPublisher(
                dataSource,codec,transport,clock,3,Duration.ofSeconds(10),Duration.ofSeconds(30));

        OutboxPublishResult first=publisher.publishBatch(10);
        assertEquals(1,first.retried());
        assertEquals("PENDING",status(assetId));
        assertEquals("SQLException",errorCode(assetId));

        clock.advance(Duration.ofSeconds(11));
        OutboxPublishResult second=publisher.publishBatch(10);
        assertEquals(1,second.published());
        assertEquals("PUBLISHED",status(assetId));
        assertEquals(2,calls.get());
    }

    @Test void outboxMovesPermanentlyFailingEventToDeadState() {
        JacksonRecordCodec codec=new JacksonRecordCodec();
        UUID assetId=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcEventIntentPort(dataSource,codec).accept(event(assetId,Map.of("label","Laptop")));

        MutableClock clock=new MutableClock(Instant.now());
        JdbcOutboxPublisher publisher=new JdbcOutboxPublisher(
                dataSource,codec,e->{throw new IllegalArgumentException("secret details");},
                clock,2,Duration.ofSeconds(1),Duration.ofSeconds(5));

        publisher.publishBatch(10);
        clock.advance(Duration.ofSeconds(2));
        OutboxPublishResult result=publisher.publishBatch(10);

        assertEquals(1,result.dead());
        assertEquals("DEAD",status(assetId));
        assertEquals("IllegalArgumentException",errorCode(assetId));
    }

    private EventEnvelope<Map<String,Object>> event(UUID assetId,Map<String,Object> payload){
        return new EventEnvelope<>(
                UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab"),
                "asset.asset.created",1,Instant.parse("2026-11-13T15:00:00Z"),TENANT,
                "asset","asset.asset",assetId.toString(),CORRELATION,null,actor(),payload);
    }

    private AuditEvent audit(UUID assetId){
        return audit(assetId, Map.of("label","Laptop"));
    }

    private AuditEvent audit(UUID assetId, Map<String,Object> changes){
        return new AuditEvent(
                UUID.fromString("019a7f0e-a234-7abc-8def-1234567890ab"),
                Instant.parse("2026-11-13T15:00:00Z"),TENANT,actor(),"asset.create",
                new ResourceReference("asset.asset",assetId.toString(),TENANT),
                AuditOutcome.SUCCESS,"asset",CORRELATION,null,changes);
    }

    private ActorReference actor(){
        return new ActorReference(ActorType.USER,"019a7f0e-1234-7abc-8def-1234567890ab",
                new IdentityReference("https://iam.vyrnforge.example","subject"),"Asset Operator");
    }

    private int count(String table)throws Exception{return countUnchecked(table);}
    private int countUnchecked(String table){
        try(Connection c=dataSource.getConnection(); Statement s=c.createStatement();
            ResultSet rs=s.executeQuery("SELECT count(*) FROM "+table)){rs.next();return rs.getInt(1);}
        catch(SQLException e){throw new IllegalStateException(e);}
    }

    private String status(UUID subjectId){
        try(Connection c=dataSource.getConnection();PreparedStatement ps=c.prepareStatement(
                "SELECT status FROM platform_event_outbox WHERE subject_id=?")){
            ps.setString(1,subjectId.toString()); try(ResultSet rs=ps.executeQuery()){rs.next();return rs.getString(1);}
        }catch(SQLException e){throw new IllegalStateException(e);}
    }

    private String errorCode(UUID subjectId){
        try(Connection c=dataSource.getConnection();PreparedStatement ps=c.prepareStatement(
                "SELECT last_error_code FROM platform_event_outbox WHERE subject_id=?")){
            ps.setString(1,subjectId.toString()); try(ResultSet rs=ps.executeQuery()){rs.next();return rs.getString(1);}
        }catch(SQLException e){throw new IllegalStateException(e);}
    }

    private static final class MutableClock extends Clock {
        private Instant instant;
        private MutableClock(Instant instant){this.instant=instant;}
        void advance(Duration d){instant=instant.plus(d);}
        @Override public ZoneId getZone(){return ZoneOffset.UTC;}
        @Override public Clock withZone(ZoneId zone){return this;}
        @Override public Instant instant(){return instant;}
    }

    private record DriverManagerDataSource(String url,String username,String password) implements DataSource {
        @Override public Connection getConnection() throws SQLException{return DriverManager.getConnection(url,username,password);}
        @Override public Connection getConnection(String u,String p)throws SQLException{return DriverManager.getConnection(url,u,p);}
        @Override public PrintWriter getLogWriter(){return null;}
        @Override public void setLogWriter(PrintWriter out){}
        @Override public void setLoginTimeout(int seconds){}
        @Override public int getLoginTimeout(){return 0;}
        @Override public Logger getParentLogger(){return Logger.getGlobal();}
        @Override public <T>T unwrap(Class<T> iface)throws SQLException{throw new SQLException("unsupported");}
        @Override public boolean isWrapperFor(Class<?> iface){return false;}
    }
}
