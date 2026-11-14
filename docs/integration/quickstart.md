# General-purpose Java quickstart

VyrnForge Platform Kernel is an embeddable Java 21 library. Use it in your own web service, modular monolith, worker or other Java application. No VyrnForge product, framework, kernel server, identity provider, broker or database is required to use the main JAR. Adopt individual capabilities; do not introduce tenancy or infrastructure solely to use UUIDs, correlation or health probes.

## 1. Install

Maven Central, no custom repository or credentials:

```xml
<dependency>
  <groupId>io.github.vyrnforge</groupId>
  <artifactId>platform-kernel</artifactId>
  <version>0.3.1</version>
</dependency>
```

Gradle (Java 21):

```kotlin
repositories { mavenCentral() }
dependencies { implementation("io.github.vyrnforge:platform-kernel:0.3.1") }
```

Optional: add `platform-kernel-jdbc` for PostgreSQL/Flyway reliability, or `platform-kernel-testkit` as a test dependency. See [distribution](three-jar-distribution.md). Java imports remain `io.vyrnforge.platform.kernel.*`.

## 2. Start with standalone primitives

```java
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.context.CorrelationContext;

var id = UuidV7.generate();
var correlation = CorrelationContext.create();
```

Generate opaque IDs and propagate the correlation context across related work. No request pipeline or authentication configuration is necessary for these primitives. See [observability and health](../observability/observability-health.md).

## 3. Select an access model

| Use case | Kernel wiring |
| --- | --- |
| Non-tenant-owned operations | `EndpointPolicy.tenantless(action)` and `TenantContext.none()`. Authentication and application authorization still run. Membership/entitlement ports are required constructor arguments but are not called for a valid tenantless request. |
| Tenant-owned operations | `EndpointPolicy.tenantModule(moduleKey, action)` and an active `TenantContext.tenant(id)`. Supply authoritative membership, entitlement and domain authorization ports. |
| Standalone contracts, IDs or telemetry | Use the relevant types directly; no request pipeline required. |

A tenantless endpoint is not an unauthenticated endpoint and cannot access a tenant-owned resource. The kernel rejects an active tenant for tenantless policy. For tenant-scoped requests the current pipeline requires a module key and an enabled matching entitlement; choose your own application-defined key (e.g. records). Entitlement is application/module availability, not a commercial licensing system, and never replaces resource authorization. The registry is an optional in-process catalog; the pipeline checks the supplied entitlement port, not the registry.

## 4. Run the example

[GeneralUsageExample.java](../../verification/GeneralUsageExample.java) is a complete executable sample, compiled and executed by repository CI against the packaged main JAR alone. It demonstrates UUIDv7, normalized identity, tenantless profile access, tenant-scoped record access, and rejection of cross-tenant, invalid-context and unauthorized requests. Its fixed identities and lambda stores are **synthetic fixtures**, not production authentication or persistence.

Save the example and obtain the main JAR using Maven (or [download it](https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.1/platform-kernel-0.3.1.jar)). From the directory containing the two files:

```bash
javac --release 21 -cp platform-kernel-0.3.1.jar GeneralUsageExample.java
java -cp ".:platform-kernel-0.3.1.jar" GeneralUsageExample
```

On Windows, replace the classpath separator `:` with `;`. No testkit, PostgreSQL, web framework or VyrnForge service is needed.

In production, replace the synthetic projection with a verified identity from your [authentication boundary](identity-boundary.md), membership/entitlement lambdas with authoritative data, and the simple permission check with your resource policy. Never trust a client-supplied tenant/owner projection. Enforce tenant isolation in actual queries and writes; kernel context is not a database security layer.

## HTTP integration

Build `HttpRequestMetadata.of(...)` from actual request headers (preserve duplicates). Create `HttpRequestContextAdapter<C>` with `HttpHeaderConfiguration.v1Defaults()` or custom names, a trusted `HttpCredentialExtractor<C>`, and your `RequestContextPipeline<C>`. The extractor must supply the credential type expected by the identity adapter; a bearer-token extractor only extracts, it does not authenticate. Use validated middleware or a real verifier.

Call `resolve(metadata, policy, resource)` before running the handler. The resource reference must be authoritative, and a create operation may use null when no resource exists yet. The default adapter expects canonical UUIDv7 tenant/correlation headers, creates a fresh request ID, and preserves opaque trace context. Map `HttpContextException` with `HttpKernelErrorMapper`; use `HttpResponseMetadata.from(context.correlation(), headers)` for response headers. Your framework owns HTTP dispatch, response serialization and non-kernel errors. There is no bundled Spring starter or server.

## 5. Add optional capabilities when needed

- **Controls:** use application-defined module keys, namespaced configuration and feature flags; flags are not permissions.
- **Events/audit:** use the transport-neutral intent contracts. Supply your own transport and storage.
- **Durable retries and writes:** add the JDBC adapter when PostgreSQL is appropriate. Apply the packaged Flyway migrations in your own database; compose domain SQL and required intents on the supplied connection. For retriable writes use `JdbcReliabilityTransaction.executeIdempotent` so the replay result commits atomically. The outbox is at-least-once compatible, not exactly-once; consumers deduplicate and operators reconcile uncertain deliveries. See [reliability semantics](../contracts/reliability-semantics.md) and [rollout/recovery](../v2/production-hardening.md).
- **Files:** `FileReference` is only a contract, not a file server or client; validate authorization in your application or storage provider.
- **Testing and operations:** use the testkit only in tests, then validate production identity, persistence, authorization, recovery, telemetry and SLOs with real infrastructure.

## What the kernel does not supply

A business-domain application, identity verification service, generic authorization engine, workflow engine, broker, universal data store, or automatic framework integration. Each application chooses its own business rules, data, authentication, transports and deployment. Public contracts and the three-JAR distribution remain the same across domains.
