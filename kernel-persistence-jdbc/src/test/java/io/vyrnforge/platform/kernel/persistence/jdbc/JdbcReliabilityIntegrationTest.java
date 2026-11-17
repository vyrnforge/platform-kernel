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
import java.util.concurrent.*;
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

    @Test void auditFingerprintRejectsDelimiterAndNullCollisionsIncludingLegacyRows() throws Exception {
        var codec = new JacksonRecordCodec();
        var port = new JdbcAuditIntentPort(dataSource, codec);
        UUID id = UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        AuditEvent original = audit(id);
        ActorReference a = new ActorReference(ActorType.USER, "a|b", new IdentityReference("c", "s"), null);
        ActorReference b = new ActorReference(ActorType.USER, "a", new IdentityReference("b|c", "s"), null);
        AuditEvent first = copyAudit(original, a, null);
        AuditEvent collision = copyAudit(original, b, null);
        AuditEvent nullCollision = copyAudit(original, a, "null");
        port.accept(first);
        assertDoesNotThrow(() -> port.accept(first));
        assertThrows(IllegalStateException.class, () -> port.accept(collision));
        assertThrows(IllegalStateException.class, () -> port.accept(nullCollision));

        // Simulate a historical row without altering released migration files.
        // The fixture runs as the test database owner only.
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            st.execute("ALTER TABLE platform_audit_event DISABLE TRIGGER USER");
            try (PreparedStatement ps = conn.prepareStatement("UPDATE platform_audit_event SET audit_fingerprint=? WHERE audit_id=?")) {
                ps.setString(1, legacyAuditHash(first, codec));
                ps.setObject(2, first.auditId());
                ps.executeUpdate();
            } finally {
                st.execute("ALTER TABLE platform_audit_event ENABLE TRIGGER USER");
            }
        }
        assertDoesNotThrow(() -> port.accept(first));
        assertThrows(IllegalStateException.class, () -> port.accept(collision));
        assertThrows(IllegalStateException.class, () -> port.accept(nullCollision));
        assertEquals(1, countUnchecked("platform_audit_event"));
    }

    @Test void eventFingerprintSupportsHistoricalReplayAndRejectsDifferentContent() throws Exception {
        var codec = new JacksonRecordCodec();
        var port = new JdbcEventIntentPort(dataSource, codec);
        UUID id = UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        var first = event(id, Map.of("label", "Laptop"));
        var different = event(id, Map.of("label", "Phone"));
        port.accept(first);
        assertDoesNotThrow(() -> port.accept(first));
        assertThrows(IllegalStateException.class, () -> port.accept(different));
        String old = SqlSupport.sha256(String.join("|",
                first.eventId().toString(), first.eventType(), Integer.toString(first.eventVersion()),
                first.occurredAt().toString(), String.valueOf(first.tenantId()), first.producer(),
                first.subjectType(), first.subjectId(), first.correlationId().toString(),
                String.valueOf(first.causationId()), String.valueOf(first.actor()), codec.encode(first.payload())));
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("UPDATE platform_event_outbox SET event_fingerprint=? WHERE event_id=?")) {
            ps.setString(1, old);
            ps.setObject(2, first.eventId());
            ps.executeUpdate();
        }
        assertDoesNotThrow(() -> port.accept(first));
        assertThrows(IllegalStateException.class, () -> port.accept(different));
        assertEquals(1, countUnchecked("platform_event_outbox"));
    }

    private AuditEvent copyAudit(AuditEvent e, ActorReference actor, String reason) {
        return new AuditEvent(e.auditId(), e.occurredAt(), e.tenantId(), actor, e.action(),
                e.resource(), e.outcome(), e.source(), e.correlationId(), reason, e.changes());
    }

    private String legacyAuditHash(AuditEvent e, JacksonRecordCodec codec) {
        ActorReference a = e.actor();
        return SqlSupport.sha256(String.join("|", e.auditId().toString(), e.occurredAt().toString(),
                String.valueOf(e.tenantId()), a.actorType().name(), a.actorId(), a.identity().issuer(),
                a.identity().subject(), String.valueOf(a.displayName()), e.action(),
                e.resource().resourceType(), e.resource().resourceId(), String.valueOf(e.resource().tenantId()),
                e.outcome().name(), e.source(), e.correlationId().toString(), String.valueOf(e.reason()),
                codec.encode(e.changes())));
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

    @Test void atomicIdempotencySurvivesLostResponseAndRejectsStaleLease() {
        MutableClock clock=new MutableClock(Instant.now());
        var codec=new JacksonRecordCodec();
        var port=new JdbcIdempotencyPort<String>(dataSource,IdempotencyResultCodec.strings(),clock);
        var tx=new JdbcReliabilityTransaction(dataSource,codec,clock);
        var request=new IdempotencyRequest(TENANT,"asset.create","atomic","fp",clock.instant().plusSeconds(300));
        var lease=port.begin(request).lease();
        UUID id=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        tx.executeIdempotent(lease,IdempotencyResultCodec.strings(),(c,e,a)->{
            try(PreparedStatement ps=c.prepareStatement("INSERT INTO asset_reference VALUES (?,?,?)")){
                ps.setObject(1,id);ps.setObject(2,TENANT);ps.setString(3,"Laptop");ps.executeUpdate();
            }
            e.accept(event(id,Map.of("label","Laptop")));a.accept(audit(id));
            return id.toString();
        });
        // Simulate loss of response after database commit, then a fresh process.
        var replay=new JdbcIdempotencyPort<String>(dataSource,IdempotencyResultCodec.strings(),clock).begin(request);
        assertEquals(IdempotencyDecisionType.REPLAY,replay.type());
        assertEquals(id.toString(),replay.replay().result());
        assertThrows(IllegalStateException.class,()->tx.executeIdempotent(lease,IdempotencyResultCodec.strings(),
                (c,e,a)->{fail("stale lease must not run");return "";}));
        assertEquals(1,countUnchecked("asset_reference"));
        assertEquals(1,countUnchecked("platform_event_outbox"));
        assertEquals(1,countUnchecked("platform_audit_event"));
    }

    @Test void expiredLeaseRollsBackDomainAndIntents() {
        MutableClock clock=new MutableClock(Instant.now());
        var codec=new JacksonRecordCodec();
        var port=new JdbcIdempotencyPort<String>(dataSource,IdempotencyResultCodec.strings(),clock);
        var tx=new JdbcReliabilityTransaction(dataSource,codec,clock);
        var request=new IdempotencyRequest(TENANT,"asset.create","expire","fp",clock.instant().plusSeconds(5));
        var lease=port.begin(request).lease();
        UUID id=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        assertThrows(IllegalStateException.class,()->tx.executeIdempotent(lease,IdempotencyResultCodec.strings(),(c,e,a)->{
            try(PreparedStatement ps=c.prepareStatement("INSERT INTO asset_reference VALUES (?,?,?)")){
                ps.setObject(1,id);ps.setObject(2,TENANT);ps.setString(3,"Laptop");ps.executeUpdate();
            }
            e.accept(event(id,Map.of("label","Laptop")));a.accept(audit(id));
            clock.advance(Duration.ofSeconds(6));
            return id.toString();
        }));
        assertEquals(0,countUnchecked("asset_reference"));
        assertEquals(0,countUnchecked("platform_event_outbox"));
        assertEquals(0,countUnchecked("platform_audit_event"));
        assertEquals(IdempotencyDecisionType.ACQUIRED,port.begin(new IdempotencyRequest(
                TENANT,"asset.create","expire","fp",clock.instant().plusSeconds(60))).type());
    }

    @Test void concurrentRetryWaitsForAtomicResult() throws Exception {
        Clock clock=Clock.fixed(Instant.now(),ZoneOffset.UTC);
        var codec=new JacksonRecordCodec();
        var port=new JdbcIdempotencyPort<String>(dataSource,IdempotencyResultCodec.strings(),clock);
        var tx=new JdbcReliabilityTransaction(dataSource,codec,clock);
        var request=new IdempotencyRequest(TENANT,"asset.create","concurrent","fp",clock.instant().plusSeconds(300));
        var lease=port.begin(request).lease();
        UUID id=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        CountDownLatch inside=new CountDownLatch(1), release=new CountDownLatch(1), retryStarted=new CountDownLatch(1);
        try(var executor=Executors.newVirtualThreadPerTaskExecutor()){
            try {
                Future<String> first=executor.submit(()->tx.executeIdempotent(lease,IdempotencyResultCodec.strings(),(c,e,a)->{
                    try(PreparedStatement ps=c.prepareStatement("INSERT INTO asset_reference VALUES (?,?,?)")){
                        ps.setObject(1,id);ps.setObject(2,TENANT);ps.setString(3,"Laptop");ps.executeUpdate();
                    }
                    inside.countDown();
                    if(!release.await(10,TimeUnit.SECONDS))throw new IllegalStateException("test timed out");
                    return id.toString();
                }));
                assertTrue(inside.await(10,TimeUnit.SECONDS));
                Future<IdempotencyDecision<String>> retry=executor.submit(()->{
                    retryStarted.countDown();
                    return new JdbcIdempotencyPort<String>(dataSource,IdempotencyResultCodec.strings(),clock).begin(request);
                });
                assertTrue(retryStarted.await(10,TimeUnit.SECONDS));
                assertThrows(TimeoutException.class,()->retry.get(200,TimeUnit.MILLISECONDS));
                release.countDown();
                assertEquals(id.toString(),first.get(10,TimeUnit.SECONDS));
                var replay=retry.get(10,TimeUnit.SECONDS);
                assertEquals(IdempotencyDecisionType.REPLAY,replay.type());
                assertEquals(id.toString(),replay.replay().result());
                assertEquals(1,countUnchecked("asset_reference"));
            } finally {release.countDown();}
        }
    }

    @Test void errorDuringTransactionCannotAccidentallyCommit() {
        var tx=new JdbcReliabilityTransaction(dataSource,new JacksonRecordCodec());
        UUID id=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        assertThrows(AssertionError.class,()->tx.execute((c,e,a)->{
            try(PreparedStatement ps=c.prepareStatement("INSERT INTO asset_reference VALUES (?,?,?)")){
                ps.setObject(1,id);ps.setObject(2,TENANT);ps.setString(3,"Laptop");ps.executeUpdate();
            }
            throw new AssertionError("simulated fatal work error");
        }));
        assertEquals(0,countUnchecked("asset_reference"));
    }

    @Test void staleOutboxWorkerCannotOverwriteNewerClaim() {
        var codec=new JacksonRecordCodec();
        UUID id=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcEventIntentPort(dataSource,codec).accept(event(id,Map.of("label","Laptop")));
        MutableClock clock=new MutableClock(Instant.now());
        var newer=new JdbcOutboxPublisher(dataSource,codec,e->{},clock,3,Duration.ZERO,Duration.ofSeconds(5));
        var older=new JdbcOutboxPublisher(dataSource,codec,e->{
            clock.advance(Duration.ofSeconds(6));
            assertEquals(1,newer.publishBatch(1).published());
            throw new SQLException("late failure");
        },clock,3,Duration.ZERO,Duration.ofSeconds(5));
        var result=older.publishBatch(1);
        assertEquals(1,result.lostClaims());
        assertEquals(0,result.retried());
        assertEquals("PUBLISHED",status(id));
    }

    @Test void expiredFinalClaimBecomesDeadWithoutAnotherSend() {
        var codec=new JacksonRecordCodec();
        UUID id=UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcEventIntentPort(dataSource,codec).accept(event(id,Map.of("label","Laptop")));
        MutableClock clock=new MutableClock(Instant.now());
        AtomicInteger sends=new AtomicInteger();
        var publisher=new JdbcOutboxPublisher(dataSource,codec,e->{
            sends.incrementAndGet();clock.advance(Duration.ofSeconds(6));
        },clock,1,Duration.ZERO,Duration.ofSeconds(5));
        assertEquals(1,publisher.publishBatch(1).lostClaims());
        assertEquals(1,publisher.publishBatch(1).dead());
        assertEquals(1,sends.get());
        assertEquals("DEAD",status(id));
        assertEquals("ATTEMPTS_EXHAUSTED",errorCode(id));
    }

    /**
     * RD2-AC03 / R12-17: a simulated process crash after acquiring a durable
     * claim must not discard the pending event. A successor recovers it only
     * after the original claim expires. This is not remote exactly-once proof.
     */
    @Test void crashAfterClaimIsRecoveredByNewPublisherAfterLeaseExpiry() {
        var codec = new JacksonRecordCodec();
        UUID assetId = UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcEventIntentPort(dataSource, codec).accept(event(assetId, Map.of("label", "Laptop")));

        var clock = new MutableClock(Instant.now());
        var sends = new AtomicInteger();
        var crashedWorker = new JdbcOutboxPublisher(dataSource, codec, envelope -> {
            sends.incrementAndGet();
            // Error deliberately escapes the publisher's Exception catch;
            // this emulates abrupt termination before its DB status update.
            throw new AssertionError("synthetic-worker-crash-after-claim");
        }, clock, 3, Duration.ZERO, Duration.ofSeconds(5));

        assertThrows(AssertionError.class, () -> crashedWorker.publishBatch(1));
        assertEquals(1, sends.get());
        assertEquals("PENDING", status(assetId));

        var successor = new JdbcOutboxPublisher(dataSource, codec, envelope -> sends.incrementAndGet(),
                clock, 3, Duration.ZERO, Duration.ofSeconds(5));
        assertEquals(0, successor.publishBatch(1).published(),
                "lease remains owned before expiry");

        clock.advance(Duration.ofSeconds(6));
        assertEquals(1, successor.publishBatch(1).published(),
                "expired claim must be recoverable by a new worker");
        assertEquals(2, sends.get(), "a crashed send may have externally succeeded");
        assertEquals("PUBLISHED", status(assetId));
        assertEquals(1, countUnchecked("platform_event_outbox"));
    }

    /**
     * R12-10 / R12-17: A may finish external transport after B has reclaimed
     * and committed; A must NOT overwrite B's authoritative outbox status.
     * Both transports may have delivered the same event (at-least-once).
     */
    @Test void lateSuccessfulTransportAfterTakeoverDoesNotOverwriteNewClaim() {
        var codec = new JacksonRecordCodec();
        UUID assetId = UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
        new JdbcEventIntentPort(dataSource, codec).accept(event(assetId, Map.of("label", "Laptop")));
        var clock = new MutableClock(Instant.now());
        var externalSends = new AtomicInteger();
        var successor = new JdbcOutboxPublisher(dataSource, codec,
                envelope -> externalSends.incrementAndGet(),
                clock, 3, Duration.ZERO, Duration.ofSeconds(5));
        var original = new JdbcOutboxPublisher(dataSource, codec, envelope -> {
            externalSends.incrementAndGet();
            clock.advance(Duration.ofSeconds(6));
            assertEquals(1, successor.publishBatch(1).published());
            // Original transport now returns "success" after losing its lease.
        }, clock, 3, Duration.ZERO, Duration.ofSeconds(5));

        var staleResult = original.publishBatch(1);
        assertEquals(1, staleResult.lostClaims(),
                "late worker must not commit a stale success");
        assertEquals(0, staleResult.published());
        assertEquals("PUBLISHED", status(assetId));
        assertEquals(2, externalSends.get(),
                "DB fencing cannot prevent duplicate external side effects");
        assertEquals(1, countUnchecked("platform_event_outbox"));
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
