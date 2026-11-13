package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ActorType;
import io.vyrnforge.platform.kernel.context.AuthenticationContext;
import io.vyrnforge.platform.kernel.context.AuthorizationProjection;
import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.context.IdentityReference;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.errors.KernelFailure;
import io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;
import io.vyrnforge.platform.kernel.pipeline.RequestContextPipeline;
import io.vyrnforge.platform.kernel.testkit.InMemoryModuleEntitlementPort;
import io.vyrnforge.platform.kernel.testkit.InMemoryTenantMembershipPort;
import io.vyrnforge.platform.kernel.testkit.PermissionAuthorizationHook;
import io.vyrnforge.platform.kernel.testkit.StaticIdentityAdapter;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HttpRequestContextAdapterTest {
    private static final UUID TENANT_A = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");
    private static final String ACTOR_ID = "019a7f0e-1234-7abc-8def-1234567890ab";
    private static final String CORRELATION_ID = "019a7f0e-6234-7abc-8def-1234567890ab";

    @Test
    void resolvesHttpMetadataAndProducesResponseIds() {
        var headers = HttpHeaderConfiguration.v1Defaults();
        var adapter = adapter(headers, true, true, Set.of("asset.read"));

        var resolved = adapter.resolve(
                request("native-token", TENANT_A, CORRELATION_ID),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                new ResourceReference("asset.asset", "asset-1", TENANT_A));

        var response = HttpResponseMetadata.from(resolved.correlation(), headers);

        assertEquals(TENANT_A, resolved.actorContext().tenant().tenantId());
        assertEquals(CORRELATION_ID, resolved.correlation().correlationId().toString());
        assertEquals(CORRELATION_ID, response.headers().get("X-Correlation-Id"));
        assertTrue(response.headers().containsKey("X-Request-Id"));
        assertNotEquals(CORRELATION_ID, response.headers().get("X-Request-Id"));
    }

    @Test
    void rejectsMalformedCorrelationWithSafe400() {
        var headers = HttpHeaderConfiguration.v1Defaults();
        var adapter = adapter(headers, true, true, Set.of("asset.read"));
        var mapper = new HttpKernelErrorMapper(headers);

        HttpContextException exception = assertThrows(HttpContextException.class, () -> adapter.resolve(
                request("native-token", TENANT_A, "not-a-uuid"),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null));

        HttpErrorResponse error = mapper.map(exception);

        assertEquals(400, error.status());
        assertEquals(KernelFailure.INVALID_CONTEXT.code(), error.body().code());
        assertTrue(error.headers().containsKey("X-Request-Id"));
        assertTrue(error.headers().containsKey("X-Correlation-Id"));
    }

    @Test
    void duplicateAuthorizationHeadersFailClosedWithoutEchoingCredential() {
        var headers = HttpHeaderConfiguration.v1Defaults();
        var adapter = adapter(headers, true, true, Set.of("asset.read"));
        var mapper = new HttpKernelErrorMapper(headers);

        HttpRequestMetadata request = HttpRequestMetadata.of(Map.of(
                "Authorization", List.of("Bearer secret-a", "Bearer secret-b"),
                "X-Tenant-Id", List.of(TENANT_A.toString())));

        HttpContextException exception = assertThrows(HttpContextException.class, () -> adapter.resolve(
                request,
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null));

        HttpErrorResponse error = mapper.map(exception);

        assertEquals(401, error.status());
        assertEquals(KernelFailure.AUTHENTICATION_FAILED.code(), error.body().code());
        assertTrue(!error.body().message().contains("secret-a"));
        assertTrue(!error.body().message().contains("secret-b"));
    }

    @Test
    void crossTenantResourceIsHiddenAs404() {
        var headers = HttpHeaderConfiguration.v1Defaults();
        var adapter = adapter(headers, true, true, Set.of("asset.read"));
        var mapper = new HttpKernelErrorMapper(headers);

        HttpContextException exception = assertThrows(HttpContextException.class, () -> adapter.resolve(
                request("native-token", TENANT_A, null),
                EndpointPolicy.tenantModule("asset", "asset.read"),
                new ResourceReference("asset.asset", "asset-b", TENANT_B)));

        HttpErrorResponse error = mapper.map(exception);

        assertEquals(404, error.status());
        assertEquals(KernelFailure.TENANT_CONTEXT_MISMATCH.code(), error.body().code());
    }

    @Test
    void customHeaderNamesAreSupported() {
        var headers = new HttpHeaderConfiguration(
                "Authorization",
                "X-Org-Id",
                "X-Flow-Id",
                "X-Req-Id",
                "X-Flow-Id",
                "traceparent",
                "tracestate");
        var adapter = adapter(headers, true, true, Set.of("asset.read"));

        HttpRequestMetadata request = HttpRequestMetadata.ofSingleValueHeaders(Map.of(
                "Authorization", "Bearer native-token",
                "X-Org-Id", TENANT_A.toString(),
                "X-Flow-Id", CORRELATION_ID));

        var resolved = adapter.resolve(
                request,
                EndpointPolicy.tenantModule("asset", "asset.read"),
                null);

        assertEquals(TENANT_A, resolved.actorContext().tenant().tenantId());
        assertEquals(CORRELATION_ID, resolved.correlation().correlationId().toString());
    }

    private HttpRequestContextAdapter<String> adapter(
            HttpHeaderConfiguration headers,
            boolean member,
            boolean enabled,
            Set<String> permissions) {

        var identity = new StaticIdentityAdapter<String>().register(
                "native-token",
                new ActorReference(
                        ActorType.USER,
                        ACTOR_ID,
                        new IdentityReference("https://iam.vyrnforge.example", "subject-123"),
                        "Example User"),
                new AuthorizationProjection(Set.of("asset-operators"), Set.of("asset_manager"), permissions),
                new AuthenticationContext(Instant.EPOCH, Set.of("pwd")));

        var memberships = new InMemoryTenantMembershipPort();
        if (member) {
            memberships.add(ACTOR_ID, TENANT_A);
        }

        var entitlements = new InMemoryModuleEntitlementPort()
                .set(TENANT_A, "asset", enabled);

        var authorization = new PermissionAuthorizationHook(Map.of(
                "asset.read", "asset.read"));

        var pipeline = new RequestContextPipeline<>(
                identity,
                memberships,
                entitlements,
                authorization);

        return new HttpRequestContextAdapter<>(
                headers,
                new BearerTokenCredentialExtractor(headers),
                pipeline);
    }

    private HttpRequestMetadata request(String token, UUID tenantId, String correlationId) {
        Map<String, String> values = new java.util.LinkedHashMap<>();
        values.put("Authorization", "Bearer " + token);
        values.put("X-Tenant-Id", tenantId.toString());
        if (correlationId != null) {
            values.put("X-Correlation-Id", correlationId);
        }
        values.put("traceparent", "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01");
        return HttpRequestMetadata.ofSingleValueHeaders(values);
    }
}
