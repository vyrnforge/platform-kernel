# General-purpose Java quickstart

VyrnForge Platform Kernel is an embeddable Java 21 library. Use it in your own web service, modular monolith, worker or other Java application. No VyrnForge product, framework, kernel server, identity provider, broker or database is required to use the main JAR. Adopt individual capabilities; do not introduce tenancy or infrastructure solely to use UUIDs, correlation or health probes.

## Choose your adoption path (v0.3.2)

Use the smallest path that satisfies the product's actual requirements. JDBC is an optional addition to a product-owned transaction, not a fourth authorization scope or a required server.

| Path | Select when | Minimum integration and verification |
| --- | --- | --- |
| A — Standalone primitives | IDs, references, wire types, correlation or health only | Core; no request pipeline, tenant or IdP solely for these primitives. Verify artifact/contract/telemetry behavior as applicable. |
| B — Authenticated tenantless | An explicitly global/non-tenant-owned operation | Core + trusted verifier + tenantless policy + domain authorization. Reject active tenant context and tenant-owned resources; no membership/entitlement lookups on valid tenantless flow. |
| C — Tenant-scoped | An operation owns or accesses tenant data | Core + trusted verifier + active tenant + authoritative membership, effective module entitlement, resource authorization and tenant-filtered queries/writes. |
| D — Optional JDBC reliability | A product-owned PostgreSQL transaction needs durable intents/replay/outbox | Add JDBC at the same version; retain path C for retriable tenant-scoped mutations. Other durable operations still need their own scope/authority and transaction semantics. Core-only local persistence is valid if equivalent behavior is verified. |

Start with one observable operation, not a new platform service. Choose the path, pin the dependencies, identify the application owner of identity/policy/data, wire the operation and verify the applicable scenarios in the [consumer conformance specification](consumer-conformance.md). Use the [adoption checklist](adoption-checklist.md) to record evidence and gaps. No application adoption is authorized by this guide.

## 1. Install

Maven Central, no custom repository or credentials:

```xml
<dependency>
  <groupId>io.github.vyrnforge</groupId>
  <artifactId>platform-kernel</artifactId>
  <version>0.3.2</version>
</dependency>
```

Gradle (Java 21):

```kotlin
repositories { mavenCentral() }
dependencies { implementation("io.github.vyrnforge:platform-kernel:0.3.2") }
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

For an application that has **only authenticated tenantless operations**, use the additive `RequestContextPipeline.tenantless(identityAdapter, domainAuthorizationHook)` factory instead of supplying unused membership/entitlement providers. It still authenticates every invocation, performs domain authorization and rejects access to tenant-owned resources or active tenant contexts. Tenant-scoped policies cannot succeed through this factory; use the full constructor for tenant-owned operations. No production IAM verifier is supplied by this factory.

## 4. Run the example

[GeneralUsageExample.java](../../verification/GeneralUsageExample.java) is a complete executable sample, compiled and executed by repository CI against the packaged main JAR alone. It demonstrates UUIDv7, normalized identity, tenantless profile access, tenant-scoped record access, and rejection of cross-tenant, invalid-context and unauthorized requests. Its fixed identities and lambda stores are **synthetic fixtures**, not production authentication or persistence.

Save the example and obtain the main JAR using Maven (or [download it](https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.2/platform-kernel-0.3.2.jar)). From the directory containing the two files:

```bash
javac --release 21 -cp platform-kernel-0.3.2.jar GeneralUsageExample.java
java -cp ".:platform-kernel-0.3.2.jar" GeneralUsageExample
```

On Windows, replace the classpath separator `:` with `;`. No testkit, PostgreSQL, web framework or VyrnForge service is needed.

In production, replace the synthetic projection with a verified identity from your [authentication boundary](identity-boundary.md), membership/entitlement lambdas with authoritative data, and the simple permission check with your resource policy. Never trust a client-supplied tenant/owner projection. Enforce tenant isolation in actual queries and writes; kernel context is not a database security layer.

## HTTP integration

Build `HttpRequestMetadata.of(...)` from actual request headers (preserve duplicates). Create `HttpRequestContextAdapter<C>` with `HttpHeaderConfiguration.v1Defaults()` or custom names, a trusted `HttpCredentialExtractor<C>`, and your `RequestContextPipeline<C>`. The extractor must supply the credential type expected by the identity adapter; a bearer-token extractor only extracts, it does not authenticate. Use validated middleware or a real verifier.

Call `resolve(metadata, policy, resource)` before running the handler. The resource reference must be authoritative, and a create operation may use null when no resource exists yet. The default adapter expects canonical UUIDv7 tenant/correlation headers, creates a fresh request ID, and preserves opaque trace context. Map `HttpContextException` with `HttpKernelErrorMapper`; use `HttpResponseMetadata.from(context.correlation(), headers)` for response headers. Your framework owns HTTP dispatch, response serialization and non-kernel errors. There is no bundled Spring starter or server.

## First conformant endpoint — integration sequence

1. **Choose the operation and authority.** Identify its resource and ownership, tenant scope, action, required event/audit intent and retry behavior. Keep business rules, authoritative data and evidence in the product. Use the path table above; a missing tenant is not permission for a deployment-wide action.
2. **Pin and verify.** Use the published 0.3.2 artifacts from Maven Central with strict checksums and dependency convergence. Record coordinates/version, actual artifact digest, application source revision and actual tested checkout. Remove legacy/split coordinates; testkit must not appear in production. See [distribution](three-jar-distribution.md).
3. **Establish trust before context.** Validate the credential using its real authentication mechanism (for tokens, signature/issuer/audience/expiry and applicable revocation; for sessions/service credentials, their approved validation and revocation rules) in the app's authentication layer; use verified issuer + subject provenance, mapping distinct issuers with the same subject to distinct stable actor IDs. Normalize to the existing identity contract and resolve the endpoint policy. Client headers are inputs, not authority. See [identity boundary](identity-boundary.md).
4. **Enforce product scope and permission.** For tenant-owned access, resolve active tenant, authoritative membership and effective entitlement, then domain authorization against the actual resource. Scope database reads/writes to the tenant; a registry, feature flag or entitlement never grants resource access. For tenantless access, still authenticate and authorize; do not use it as an IAM DEPLOYMENT substitute. Preserve IAM's separate deployment semantics and local monotonic UUIDv7 under its own ADR-0085.
5. **Perform the operation.** For read-only/non-durable work apply the actual product policy. For a durable non-retriable mutation commit the product mutation and required intents atomically. For a retriable tenant-scoped mutation authorize each attempt before acquiring or replaying idempotency, use a fingerprint bound to effective caller/target semantics, and commit the mutation, required intents and replay result atomically. Optional JDBC acquires with JdbcIdempotencyPort.begin and uses JdbcReliabilityTransaction.executeIdempotent on the supplied connection, never a separate execute + complete. Only ACQUIRED executes work; handle IN_PROGRESS/CONFLICT safely and REPLAY after current authorization. Retain results for the agreed retry window; after expiry reacquisition/re-execution is permitted. Local persistence must meet the same applicable invariants. No external network effects inside the authoritative transaction. No dual authoritative stores. Event receiver deduplication is distinct from API mutation idempotency.
6. **Return safe wire output.** Use canonical snake_case, lowercase enum values, UTC instants and required nullable fields; validate serialized v0.2 schema shape, including object event payload. Keep external IDs opaque, use canonical UUIDv7 for new Kernel-owned IDs; a FileReference is not an access grant. Map safe error and metadata; fresh request ID, preserved correlation, opaque trace context. Never expose tokens, credentials, signed URLs or another tenant's resource details in errors, audit/event payloads, logs or traces. An authorized file-transfer response may deliberately return a scoped, time-limited signed URL under File Storage/product policy; never treat it as a reusable cached replay result after expiry.
7. **Handoff verification.** Record applicable positive/negative checks and actual outcomes, dependency/identity/tenant/replay evidence, safe logs and readiness. For stateful operation include product-owned restore/load/SLO/RPO/RTO and rollback evidence. Synthetic examples and passing library CI do not establish live product acceptance; missing or stale mandatory evidence stays open. See [conformance](consumer-conformance.md).

## 5. Add optional capabilities when needed

- **Controls:** use application-defined module keys, namespaced configuration and feature flags; flags are not permissions.
- **Events/audit:** use the transport-neutral intent contracts. Supply your own transport and storage.
- **Durable retries and writes:** add the JDBC adapter when PostgreSQL is appropriate. Apply the packaged Flyway migrations in your own database; compose domain SQL and required intents on the supplied connection. For retriable tenant-scoped writes use `JdbcReliabilityTransaction.executeIdempotent` so the replay result commits atomically; for non-retriable durable mutations use the applicable atomic transaction without inventing an idempotency record. The outbox is at-least-once compatible, not exactly-once; consumers deduplicate and operators reconcile uncertain deliveries. See [reliability semantics](../contracts/reliability-semantics.md) and [rollout/recovery](../v2/production-hardening.md).
- **Files:** `FileReference` is only a contract, not a file server or client; validate authorization in your application or storage provider.
- **Testing and operations:** use the testkit only in tests, then validate production identity, persistence, authorization, recovery, telemetry and SLOs with real infrastructure.

### Durable adoption and rollback guardrails

Use [reliability semantics](../contracts/reliability-semantics.md), [production hardening](../v2/production-hardening.md) and [0.3.2 audit remediation](../v2/audit-remediation.md) together. If selecting Kernel JDBC, apply immutable V1–V3 migrations only in the owning product database with separate least-privilege runtime/migration roles. All applicable audit implementations preserve authoritative evidence and tenant/resource consistency; never rewrite historical audit rows. A fresh installation does not need to simulate an old-writer migration unless it is part of the actual rollout plan. Stop/drain old publishers before V3 and old intent writers before 0.3.2 fingerprint writes. Do not run mixed old/new writers or roll back older writers against new fingerprints without a reviewed recovery plan. No schema rollback to evade fencing. Retain evidence and reconcile pending, expired and uncertain deliveries before re-drive. A DEAD event may already have been delivered; deduplicate by event ID at the receiver. Use bounded transport timeouts, batch sizes, retries and leases. Reauthorize current caller before replay; do not replay expired credentials or signed URLs.

## What the kernel does not supply

A business-domain application, identity verification service, generic authorization engine, workflow engine, broker, universal data store, or automatic framework integration. Each application chooses its own business rules, data, authentication, transports and deployment. Public contracts and the three-JAR distribution remain the same across domains.
