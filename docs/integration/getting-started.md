# General-purpose Java quickstart

Platform Kernel is a library, not a server or an application suite. Any Java 21 application can use it. There is no requirement to install a VyrnForge product, use a specific IAM provider, adopt multi-tenancy, or run PostgreSQL.

## 1. Pick what you need

| Need | Library / integration |
| --- | --- |
| UUIDv7, correlation IDs, health probes, contracts | `platform-kernel`; use individual classes directly |
| Request identity, tenant context and access checks | `platform-kernel`; implement your authentication and authorization ports |
| Transactional event/audit intent and retriable mutations | Optional `platform-kernel-jdbc`; PostgreSQL, Flyway and your application's DataSource |
| Test fixtures and in-memory adapters | Optional `platform-kernel-testkit` with test scope |

## 2. Install

```xml
<dependency>
  <groupId>io.github.vyrnforge</groupId>
  <artifactId>platform-kernel</artifactId>
  <version>0.3.1</version>
</dependency>
```

Maven Central is the default repository. Gradle Kotlin DSL: `implementation("io.github.vyrnforge:platform-kernel:0.3.1")`. No credentials or custom repository are needed.

## 3. Run a standalone example

From the repository root, with Java 21 and Maven installed:

```bash
cd examples/general-java
mvn org.apache.maven.plugins:maven-dependency-plugin:3.8.1:copy-dependencies
java -cp target/dependency/platform-kernel-0.3.1.jar Example.java
```

[Example.java](../../examples/general-java/Example.java) is a complete runnable document-service example using only the main library. It demonstrates authorized access, authenticated tenantless access, cross-tenant rejection, denied permissions, disabled modules, and non-membership. The credential and port implementations are explicit demo fixtures, **not production authentication or policy**. No web server, database or testkit is needed.

## 4. Connect to your application

- Authenticate with your existing trusted middleware (session, external IdP, IAM, service identity). Build a `ValidatedIdentityCredential` only from its verified result. Never trust decoded but unverified token claims.
- Decide the endpoint scope: `EndpointPolicy.tenantless("profile.read")` for explicitly non-tenant operations, or `EndpointPolicy.tenantModule("documents", "document.read")` for tenant-scoped operations. For a tenant-scoped pipeline endpoint a module key, membership and enabled entitlement are required in this version. A simple application can use its own application/module key; no commercial license service is required.
- Supply `TenantMembershipPort`, `ModuleEntitlementPort` and `DomainAuthorizationHook` from authoritative application data. An entitlement is availability, not user permission. Tenantless endpoints still require authentication and domain authorization; they cannot access tenant-owned resources. The example permission check is illustrative; real policy may also inspect resource ownership, relationships and other rules.
- Resolve `RequestContextInput` through `RequestContextPipeline`. Use the resolved tenant in every data access; do not let a request-provided resource reference substitute for authoritative resource ownership. Map safe failures with the HTTP adapter or your own framework boundary. No Spring/Servlet dependency is required.
- If you only need IDs, events, audit contracts, correlation or health, use those APIs independently; you do not need to construct the request pipeline.

## 5. Add durable reliability when needed

The optional JDBC adapter runs in your application's database with Flyway V1–V3. Supply a DataSource and your domain transaction work. For retriable writes, use the acquire/replay decision and `JdbcReliabilityTransaction.executeIdempotent` so domain changes, required event/audit intent and result commit atomically. External side effects remain outside that transaction. Supply your own transport, schedule the outbox publisher, deduplicate at the consumer, and reconcile terminal failures. See [reliability semantics](../contracts/reliability-semantics.md) and [production hardening](../v2/production-hardening.md).

## Boundaries

You own business data, authentication, resource authorization, persistence, transport and telemetry integration. The kernel provides reusable technical contracts and enforcement plumbing. File references are external-service references, not a file storage client. Workflow, notifications, and a general policy engine are not shipped. The internal Asset reference tests are an optional illustration, not a dependency or a prescribed application design.

[Library coordinates and migration](three-jar-distribution.md) · [Identity boundary](identity-boundary.md) · [Observability](../observability/observability-health.md)
