package io.vyrnforge.platform.kernel.consumer.asset;

import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.http.BearerTokenCredentialExtractor;
import io.vyrnforge.platform.kernel.http.HttpContextException;
import io.vyrnforge.platform.kernel.http.HttpErrorResponse;
import io.vyrnforge.platform.kernel.http.HttpHeaderConfiguration;
import io.vyrnforge.platform.kernel.http.HttpKernelErrorMapper;
import io.vyrnforge.platform.kernel.http.HttpRequestContextAdapter;
import io.vyrnforge.platform.kernel.http.HttpRequestMetadata;
import io.vyrnforge.platform.kernel.http.HttpResponseMetadata;
import io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;
import io.vyrnforge.platform.kernel.pipeline.RequestContextPipeline;
import io.vyrnforge.platform.kernel.testkit.InMemoryModuleEntitlementPort;
import io.vyrnforge.platform.kernel.testkit.InMemoryTenantMembershipPort;
import io.vyrnforge.platform.kernel.testkit.PermissionAuthorizationHook;
import io.vyrnforge.platform.kernel.testkit.StaticIdentityAdapter;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssetHttpReferenceIntegrationTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");
    private static final String USER_ID = "019a7f0e-1234-7abc-8def-1234567890ab";
    private static final String ASSET_ID = "019a7f0e-5234-7abc-8def-1234567890ab";
    private static final String CORRELATION_ID = "019a7f0e-6234-7abc-8def-1234567890ab";

    @Test
    void nativeAndExternalIdentityNormalizeToSamePlatformActor() {
        AssetFixture fixture = fixture(true, true, Set.of("asset.read"));

        var nativeContext = fixture.adapter().resolve(
                request("native-token", TENANT_A, CORRELATION_ID),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                asset(TENANT_A));

        var externalContext = fixture.adapter().resolve(
                request("external-token", TENANT_A, CORRELATION_ID),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                asset(TENANT_A));

        assertEquals(USER_ID, nativeContext.actorContext().actor().actorId());
        assertEquals(USER_ID, externalContext.actorContext().actor().actorId());
        assertNotEquals(
                nativeContext.actorContext().actor().identity().issuer(),
                externalContext.actorContext().actor().identity().issuer());
        assertEquals(TENANT_A, nativeContext.actorContext().tenant().tenantId());
        assertEquals(TENANT_A, externalContext.actorContext().tenant().tenantId());
    }

    @Test
    void assetReadReturnsTraceabilityMetadata() {
        AssetFixture fixture = fixture(true, true, Set.of("asset.read"));

        var resolved = fixture.adapter().resolve(
                request("external-token", TENANT_A, CORRELATION_ID),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                asset(TENANT_A));

        var response = HttpResponseMetadata.from(resolved.correlation(), fixture.headers());

        assertEquals(CORRELATION_ID, response.headers().get("X-Correlation-Id"));
        assertTrue(response.headers().containsKey("X-Request-Id"));
        assertNotEquals(CORRELATION_ID, response.headers().get("X-Request-Id"));
    }

    @Test
    void tenantlessAssetRequestIsDenied() {
        AssetFixture fixture = fixture(true, true, Set.of("asset.read"));

        HttpContextException exception = assertThrows(HttpContextException.class, () -> fixture.adapter().resolve(
                requestWithoutTenant("native-token"),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null));

        HttpErrorResponse error = fixture.errorMapper().map(exception);

        assertEquals(403, error.status());
        assertEquals(KernelFailure.TENANT_REQUIRED.code(), error.body().code());
    }

    @Test
    void actorWithoutTenantMembershipIsDenied() {
        AssetFixture fixture = fixture(false, true, Set.of("asset.read"));

        HttpContextException exception = assertThrows(HttpContextException.class, () -> fixture.adapter().resolve(
                request("native-token", TENANT_A, null),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null));

        HttpErrorResponse error = fixture.errorMapper().map(exception);

        assertEquals(403, error.status());
        assertEquals(KernelFailure.TENANT_MEMBERSHIP_REQUIRED.code(), error.body().code());
    }

    @Test
    void crossTenantAssetReferenceDoesNotLeakAsAuthorizedResource() {
        AssetFixture fixture = fixture(true, true, Set.of("asset.read"));

        HttpContextException exception = assertThrows(HttpContextException.class, () -> fixture.adapter().resolve(
                request("native-token", TENANT_A, null),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                asset(TENANT_B)));

        HttpErrorResponse error = fixture.errorMapper().map(exception);

        assertEquals(404, error.status());
        assertEquals(KernelFailure.TENANT_CONTEXT_MISMATCH.code(), error.body().code());
    }

    @Test
    void disabledAssetModuleIsDeniedBeforeDomainPermission() {
        AssetFixture fixture = fixture(true, false, Set.of("asset.read"));

        HttpContextException exception = assertThrows(HttpContextException.class, () -> fixture.adapter().resolve(
                request("native-token", TENANT_A, null),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null));

        HttpErrorResponse error = fixture.errorMapper().map(exception);

        assertEquals(403, error.status());
        assertEquals(KernelFailure.MODULE_DISABLED.code(), error.body().code());
    }

    @Test
    void enabledModuleStillRequiresAssetDomainPermission() {
        AssetFixture fixture = fixture(true, true, Set.of());

        HttpContextException exception = assertThrows(HttpContextException.class, () -> fixture.adapter().resolve(
                request("native-token", TENANT_A, null),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null));

        HttpErrorResponse error = fixture.errorMapper().map(exception);

        assertEquals(403, error.status());
        assertEquals(KernelFailure.DOMAIN_ACCESS_DENIED.code(), error.body().code());
    }

    private AssetFixture fixture(boolean member, boolean moduleEnabled, Set<String> permissions) {
        HttpHeaderConfiguration headers = HttpHeaderConfiguration.v1Defaults();

        var identity = new StaticIdentityAdapter<String>()
                .register(
                        "native-token",
                        actor("https://iam.vyrnforge.example", "native-subject"),
                        authz(permissions),
                        authentication())
                .register(
                        "external-token",
                        actor("https://login.example-idp.com/tenant", "external-subject"),
                        authz(permissions),
                        authentication());

        var memberships = new InMemoryTenantMembershipPort();
        if (member) {
            memberships.add(USER_ID, TENANT_A);
        }

        var entitlements = new InMemoryModuleEntitlementPort()
                .set(TENANT_A, "asset", moduleEnabled);

        var domainAuthorization = new PermissionAuthorizationHook(Map.of(
                "asset.read", "asset.read"));

        var pipeline = new RequestContextPipeline<>(
                identity,
                memberships,
                entitlements,
                domainAuthorization);

        var adapter = new HttpRequestContextAdapter<>(
                headers,
                new BearerTokenCredentialExtractor(headers),
                pipeline);

        return new AssetFixture(
                headers,
                adapter,
                new HttpKernelErrorMapper(headers));
    }

    private ActorReference actor(String issuer, String subject) {
        return new ActorReference(
                ActorType.USER,
                USER_ID,
                new IdentityReference(issuer, subject),
                "Asset Operator");
    }

    private AuthorizationProjection authz(Set<String> permissions) {
        return new AuthorizationProjection(
                Set.of("asset-operators"),
                Set.of("asset_manager"),
                permissions);
    }

    private AuthenticationContext authentication() {
        return new AuthenticationContext(Instant.EPOCH, Set.of("pwd"));
    }

    private ResourceReference asset(UUID tenantId) {
        return new ResourceReference("asset.asset", ASSET_ID, tenantId);
    }

    private HttpRequestMetadata request(String token, UUID tenantId, String correlationId) {
        Map<String, String> values = new LinkedHashMap<>();
        values.put("Authorization", "Bearer " + token);
        values.put("X-Tenant-Id", tenantId.toString());
        if (correlationId != null) {
            values.put("X-Correlation-Id", correlationId);
        }
        return HttpRequestMetadata.ofSingleValueHeaders(values);
    }

    private HttpRequestMetadata requestWithoutTenant(String token) {
        return HttpRequestMetadata.ofSingleValueHeaders(Map.of(
                "Authorization", "Bearer " + token));
    }

    private record AssetFixture(
            HttpHeaderConfiguration headers,
            HttpRequestContextAdapter<String> adapter,
            HttpKernelErrorMapper errorMapper) {
    }
}
