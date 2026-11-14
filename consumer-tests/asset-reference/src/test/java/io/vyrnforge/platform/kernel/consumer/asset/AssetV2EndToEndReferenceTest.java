package io.vyrnforge.platform.kernel.consumer.asset;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.audit.AuditOutcome;
import io.vyrnforge.platform.kernel.config.ConfigurationKey;
import io.vyrnforge.platform.kernel.context.*;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.feature.FeatureFlagKey;
import io.vyrnforge.platform.kernel.health.*;
import io.vyrnforge.platform.kernel.http.*;
import io.vyrnforge.platform.kernel.idempotency.*;
import io.vyrnforge.platform.kernel.module.ProductModule;
import io.vyrnforge.platform.kernel.module.StaticProductModuleRegistry;
import io.vyrnforge.platform.kernel.observability.TelemetryAttributePolicy;
import io.vyrnforge.platform.kernel.observability.TelemetryAttributes;
import io.vyrnforge.platform.kernel.persistence.jdbc.*;
import io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;
import io.vyrnforge.platform.kernel.pipeline.RequestContextPipeline;
import io.vyrnforge.platform.kernel.testkit.*;
import org.junit.jupiter.api.*;
import org.testcontainers.containers.PostgreSQLContainer;

import javax.sql.DataSource;
import java.io.PrintWriter;
import java.sql.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.*;

class AssetV2EndToEndReferenceTest {
    private static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:17-alpine")
                    .withDatabaseName("asset_v2")
                    .withUsername("kernel")
                    .withPassword("kernel");

    private static final UUID TENANT =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final String ACTOR_ID =
            "019a7f0e-1234-7abc-8def-1234567890ab";
    private static final UUID ASSET_ID =
            UUID.fromString("019a7f0e-5234-7abc-8def-1234567890ab");
    private static final UUID CORRELATION =
            UUID.fromString("019a7f0e-6234-7abc-8def-1234567890ab");

    private static DataSource dataSource;

    @BeforeAll
    static void startDatabase() throws Exception {
        POSTGRES.start();
        dataSource = new DriverManagerDataSource(
                POSTGRES.getJdbcUrl(),
                POSTGRES.getUsername(),
                POSTGRES.getPassword());
        KernelJdbcMigrator.migrate(dataSource);

        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("""
                    CREATE TABLE asset_v2_reference (
                      id UUID PRIMARY KEY,
                      tenant_id UUID NOT NULL,
                      label TEXT NOT NULL,
                      assigned_actor_id VARCHAR(512) NOT NULL
                    )
                    """);
        }
    }

    @AfterAll
    static void stopDatabase() {
        POSTGRES.stop();
    }

    @BeforeEach
    void cleanDatabase() throws Exception {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            statement.execute("""
                    TRUNCATE asset_v2_reference,
                             platform_event_outbox,
                             platform_audit_event,
                             platform_idempotency
                    """);
        }
    }

    @Test
    void assetV2GoldenPathCrossesAllImplementedKernelBoundaries() throws Exception {
        Instant now = Instant.parse("2026-11-14T00:00:00Z");
        Clock clock = Clock.fixed(now, ZoneOffset.UTC);

        var registry = StaticProductModuleRegistry.of(
                new ProductModule("asset"),
                new ProductModule("itsm"));
        assertTrue(registry.contains("asset"));

        var entitlements = new InMemoryModuleEntitlementPort()
                .set(TENANT, "asset", true);
        var memberships = new InMemoryTenantMembershipPort()
                .add(ACTOR_ID, TENANT);

        var identity = new StaticIdentityAdapter<String>()
                .register(
                        "external-token",
                        new ActorReference(
                                ActorType.USER,
                                ACTOR_ID,
                                new IdentityReference(
                                        "https://login.example-idp.com/tenant",
                                        "external-subject"),
                                "Asset Operator"),
                        new AuthorizationProjection(
                                Set.of("asset-operators"),
                                Set.of("asset_manager"),
                                Set.of("asset.create")),
                        new AuthenticationContext(now, Set.of("pwd")));

        var pipeline = new RequestContextPipeline<>(
                identity,
                memberships,
                entitlements,
                new PermissionAuthorizationHook(
                        Map.of("asset.create", "asset.create")));

        HttpHeaderConfiguration headers = HttpHeaderConfiguration.v1Defaults();
        var http = new HttpRequestContextAdapter<>(
                headers,
                new BearerTokenCredentialExtractor(headers),
                pipeline);

        var resolved = http.resolve(
                HttpRequestMetadata.ofSingleValueHeaders(Map.of(
                        "Authorization", "Bearer external-token",
                        "X-Tenant-Id", TENANT.toString(),
                        "X-Correlation-Id", CORRELATION.toString())),
                EndpointPolicy.tenantModule("asset", "asset.create"),
                null);

        assertEquals(TENANT, resolved.actorContext().tenant().tenantId());
        assertEquals(CORRELATION, resolved.correlation().correlationId());

        FeatureFlagKey feature = new FeatureFlagKey("asset.create-v2");
        ConfigurationKey config = new ConfigurationKey("asset.create.default-label");
        var flags = new InMemoryFeatureFlagPort()
                .set(feature, TenantContext.tenant(TENANT), true);
        var configuration = new InMemoryConfigurationPort()
                .set(config, TenantContext.tenant(TENANT), "Laptop");

        assertTrue(flags.isEnabled(feature, TenantContext.tenant(TENANT)));
        String label = configuration
                .get(config, TenantContext.tenant(TENANT))
                .orElseThrow();

        JdbcIdempotencyPort<String> idempotency = new JdbcIdempotencyPort<>(
                dataSource,
                IdempotencyResultCodec.strings(),
                clock);

        IdempotencyRequest idempotencyRequest = new IdempotencyRequest(
                TENANT,
                "asset.create",
                "asset-create-request-1",
                "sha256:asset-create-v2",
                now.plusSeconds(300));

        var decision = idempotency.begin(idempotencyRequest);
        assertEquals(IdempotencyDecisionType.ACQUIRED, decision.type());

        JacksonRecordCodec codec = new JacksonRecordCodec();
        JdbcReliabilityTransaction transaction =
                new JdbcReliabilityTransaction(dataSource, codec, clock);

        transaction.execute((connection, events, audits) -> {
            try (PreparedStatement statement = connection.prepareStatement("""
                    INSERT INTO asset_v2_reference
                      (id, tenant_id, label, assigned_actor_id)
                    VALUES (?, ?, ?, ?)
                    """)) {
                statement.setObject(1, ASSET_ID);
                statement.setObject(2, TENANT);
                statement.setString(3, label);
                statement.setString(4, ACTOR_ID);
                statement.executeUpdate();
            }

            ActorReference actor = resolved.actorContext().actor();

            events.accept(new EventEnvelope<>(
                    UUID.fromString("019a7f0e-4234-7abc-8def-1234567890ab"),
                    "asset.asset.created",
                    1,
                    now,
                    TENANT,
                    "asset",
                    "asset.asset",
                    ASSET_ID.toString(),
                    CORRELATION,
                    null,
                    actor,
                    Map.of("label", label, "assigned_actor_id", ACTOR_ID)));

            audits.accept(new AuditEvent(
                    UUID.fromString("019a7f0e-a234-7abc-8def-1234567890ab"),
                    now,
                    TENANT,
                    actor,
                    "asset.create",
                    new ResourceReference(
                            "asset.asset",
                            ASSET_ID.toString(),
                            TENANT),
                    AuditOutcome.SUCCESS,
                    "asset",
                    CORRELATION,
                    "Asset created through V2 reference flow.",
                    Map.of("label", label)));

            return null;
        });

        idempotency.complete(decision.lease(), ASSET_ID.toString());

        List<EventEnvelope<Object>> published =
                new CopyOnWriteArrayList<>();
        JdbcOutboxPublisher publisher = new JdbcOutboxPublisher(
                dataSource,
                codec,
                published::add,
                clock,
                3,
                Duration.ofSeconds(1),
                Duration.ofSeconds(30));

        OutboxPublishResult publishResult = publisher.publishBatch(10);

        assertEquals(1, publishResult.published());
        assertEquals(1, published.size());
        assertEquals(CORRELATION, published.getFirst().correlationId());

        var replay = new JdbcIdempotencyPort<>(
                dataSource,
                IdempotencyResultCodec.strings(),
                clock)
                .begin(idempotencyRequest);

        assertEquals(IdempotencyDecisionType.REPLAY, replay.type());
        assertEquals(ASSET_ID.toString(), replay.replay().result());

        assertEquals(1, count("asset_v2_reference"));
        assertEquals(1, count("platform_audit_event"));
        assertEquals("PUBLISHED", outboxStatus());

        Map<String, String> telemetry = TelemetryAttributes.forRequest(
                "asset",
                "test",
                "asset.create",
                "success",
                resolved,
                TelemetryAttributePolicy.safeDefaults());

        assertEquals(CORRELATION.toString(), telemetry.get("correlation_id"));
        assertFalse(telemetry.containsKey("actor_id"));
        assertFalse(telemetry.containsKey("tenant_id"));

        HealthAggregator health = new HealthAggregator(
                clock,
                List.of(
                        HealthProbe.liveness("self", ProbeResult::up),
                        HealthProbe.readiness("database", this::databaseReady)));

        assertTrue(health.check(ProbeType.LIVENESS).healthy());
        assertTrue(health.check(ProbeType.READINESS).healthy());

        HttpResponseMetadata response =
                HttpResponseMetadata.from(resolved.correlation(), headers);
        assertEquals(
                CORRELATION.toString(),
                response.headers().get("X-Correlation-Id"));
        assertNotNull(response.headers().get("X-Request-Id"));
    }

    private ProbeResult databaseReady() {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT 1")) {
            return result.next() ? ProbeResult.up() : ProbeResult.down("DATABASE_UNAVAILABLE");
        } catch (SQLException e) {
            return ProbeResult.down("DATABASE_UNAVAILABLE");
        }
    }

    private int count(String table) throws SQLException {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT count(*) FROM " + table)) {
            result.next();
            return result.getInt(1);
        }
    }

    private String outboxStatus() throws SQLException {
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT status FROM platform_event_outbox")) {
            result.next();
            return result.getString(1);
        }
    }

    private record DriverManagerDataSource(
            String url,
            String username,
            String password) implements DataSource {

        @Override
        public Connection getConnection() throws SQLException {
            return DriverManager.getConnection(url, username, password);
        }

        @Override
        public Connection getConnection(String user, String pass) throws SQLException {
            return DriverManager.getConnection(url, user, pass);
        }

        @Override public PrintWriter getLogWriter() { return null; }
        @Override public void setLogWriter(PrintWriter out) {}
        @Override public void setLoginTimeout(int seconds) {}
        @Override public int getLoginTimeout() { return 0; }
        @Override public Logger getParentLogger() { return Logger.getGlobal(); }
        @Override public <T> T unwrap(Class<T> iface) throws SQLException {
            throw new SQLException("unsupported");
        }
        @Override public boolean isWrapperFor(Class<?> iface) { return false; }
    }
}
