# Framework-neutral HTTP edge integration recipe

This guide is an optional *composition pattern* using existing public v0.3.2 APIs, not a new framework, Spring starter, IAM implementation or permission engine. The application owns credential verification, route policy and authoritative resources.

## Wire a trusted verifier once

```java
import io.vyrnforge.platform.kernel.context.ActorContext;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.http.*;
import io.vyrnforge.platform.kernel.pipeline.*;
import io.vyrnforge.platform.kernel.ports.*;

public final class HttpKernelWiring {
    @FunctionalInterface
    public interface VerifiedBearerService {
        // Must actually verify signature/issuer/audience/expiry/revocation, and normalize.
        ActorContext authenticate(String token, TenantContext requestedTenant);
    }

    public static HttpRequestContextAdapter<String> tenantScoped(
            VerifiedBearerService verified,
            TenantMembershipPort membership,
            ModuleEntitlementPort entitlement,
            DomainAuthorizationHook domainAuthorization) {
        var headers = HttpHeaderConfiguration.v1Defaults();
        var pipeline = new RequestContextPipeline<String>(
                verified::authenticate, membership, entitlement, domainAuthorization);
        return new HttpRequestContextAdapter<>(
                headers, new BearerTokenCredentialExtractor(headers), pipeline);
    }
}
```

`BearerTokenCredentialExtractor` **extracts**, but never verifies tokens. Keep a real verifier, authoritative membership and effective entitlement provider in the application composition root. `DomainAuthorizationHook` uses the domain's actual resource ownership; it is not replaced by module entitlement or normalized permission strings.

For an authenticated **tenantless-only** application, the separately proposed additive `RequestContextPipeline.tenantless(...)` factory avoids irrelevant membership/entitlement wiring. It still requires a trusted verifier and product authorization, and it cannot read tenant-owned data.

## Per-request HTTP flow

1. Construct `HttpRequestMetadata.of(actualMultimapHeaders)`, retaining case-insensitive duplicates, rather than collapsing them to a `Map<String, String>` where ambiguous security-sensitive headers can disappear.
2. Resolve `EndpointPolicy.tenantModule(moduleKey, action)` or `EndpointPolicy.tenantless(action)`. Derive the `ResourceReference` from authoritative product data. For a create endpoint with no existing resource, null is allowed; independently ensure the newly created rows are tenant-scoped.
3. Call `HttpRequestContextAdapter.resolve(metadata, policy, resource)` **before** dispatching domain work. Client-supplied tenant/correlation headers are metadata inputs, not evidence of membership or authorization.
4. On success, propagate `HttpResponseMetadata.from(resolved.correlation(), headers)`. On a caught `HttpContextException`, use `new HttpKernelErrorMapper(headers).map(error)` and serialize the safe `ApiError` shape through the application's versioned JSON serializer.
5. Propagate the business correlation ID to subsequent event/job boundaries. A fresh request ID identifies each invocation; traceparent/tracestate remain opaque and do not replace tenant or authentication context.

## Negative cases before release

Assert duplicate/case-varied Authorization/Tenant/Correlation headers, malformed IDs, absent tenant, tenantless requests with active tenant, cross-tenant resource, disabled module, missing membership and denied domain action all fail with safe HTTP error shapes. Never log or echo credentials. Validate the final transport JSON against the released v0.2 schemas, including required nulls, snake_case, UTC and lowercase enums.

The kernel's synthetic testkit tests do not certify a real HTTP framework, token verifier or application database isolation. Use product-specific conformance and keep real-identity/Storage adoption separately gated under issue #41.
