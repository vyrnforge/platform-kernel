# VyrnForge Platform Kernel

**Modular products. Unified platform.** A thin, framework-neutral Java 21 library for adding identity context, access-control plumbing, reliability contracts and observability to **any Java application**. No VyrnForge application, IAM product, shared server, database or broker is required to use the main library.

[Product website / Flow Studio](https://vyrnforge.github.io/platform-kernel/) · [Releases](https://github.com/vyrnforge/platform-kernel/releases) · [Documentation](docs/README.md) · [Apache-2.0](LICENSE)

## Get started

Requires Java 21. Maven Central is the canonical distribution for the organization namespace `io.github.vyrnforge`. [v0.3.2 is published on Maven Central](https://central.sonatype.com/artifact/io.github.vyrnforge/platform-kernel/0.3.2) and verified with an anonymous Maven consumer. No custom Maven repository or credentials are needed. The previous 0.3.0 distribution remains available on GitHub Packages.

| Artifact | Use |
| --- | --- |
| `platform-kernel` | Main runtime: identity/tenancy, HTTP, controls, observability, IDs, event/audit/idempotency contracts and JSON schemas. No production third-party dependencies. |
| `platform-kernel-jdbc` | Optional PostgreSQL/Flyway adapter: atomic mutation + event/audit + idempotency, fenced outbox, migrations. |
| `platform-kernel-testkit` | Test-scope in-memory ports and fixtures. |

See [Maven dependencies and migration](docs/integration/three-jar-distribution.md) for exact coordinates. The parent POM and source/Javadoc archives are metadata/documentation, not extra runtime libraries. Internal reference tests are examples, not runtime dependencies.

```xml
<dependency>
  <groupId>io.github.vyrnforge</groupId>
  <artifactId>platform-kernel</artifactId>
  <version>0.3.2</version>
</dependency>
```

## Choose the capabilities you need

- **Any Java service, CLI or background worker:** use UUIDv7, request/correlation context, safe telemetry, health probes and versioned contracts without wiring an identity provider or persistence adapter.
- **Authenticated, non-multi-tenant application:** use trusted identity and an explicitly tenantless endpoint with application-owned authorization. Membership and entitlement checks do not run for that endpoint; it must not access tenant-owned resources.
- **Multi-tenant application:** resolve a tenant-scoped endpoint with your own membership and module-entitlement ports, then enforce your resource policy. Module keys are application-defined; no predefined product catalog or commercial licensing system is required.
- **Durable database-backed operations:** optionally add the JDBC adapter for PostgreSQL/Flyway. Use your own business tables and transport. The testkit is optional and test-scoped.

Start with the [general-purpose Java quickstart](docs/integration/quickstart.md), including a runnable example using only the main JAR.

## How it works

```text
Example tenant-scoped HTTP request -> trusted identity -> tenant context
  -> membership -> module entitlement -> application authorization -> handler
  -> correlation / safe response metadata
```

The kernel consumes a trusted identity projection from your authentication middleware; the product owns resource authorization and data. For durable retriable writes, use `JdbcReliabilityTransaction.executeIdempotent`: domain mutation, required event/audit intents and replay result commit together. The outbox is at-least-once compatible, not exactly-once. Products supply the event transport, telemetry backend and production stores.

## Integration guides

- [Application adoption checklist](docs/integration/adoption-checklist.md)
- [Identity boundary](docs/integration/identity-boundary.md)
- [General-purpose quickstart and HTTP integration](docs/integration/quickstart.md)
- [Reliability semantics](docs/contracts/reliability-semantics.md) and [JDBC rollout / recovery](docs/v2/production-hardening.md)
- [Correlation and health](docs/observability/observability-health.md)
- [Release and contributor operations](docs/releases/README.md)

`FileReference` is an opaque reference contract; no file storage service/client is required or shipped. No workflow engine, IAM implementation, broker, shared business database or mandatory service topology is included. Authentication verification, business data, authorization policies and operational acceptance remain application responsibilities.

## Build from source

Java 21, Maven 3.9+, Docker for PostgreSQL Testcontainers.

```bash
mvn --batch-mode --no-transfer-progress --strict-checksums -Prelease-docs clean verify
python3 scripts/check-contract-compatibility.py
python3 scripts/check-distribution.py --release-docs
```

For a dependency-free Java smoke test, use `bash scripts/verify-core.sh`. See [CONTRIBUTING.md](CONTRIBUTING.md) for changes and [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Compatibility

The Maven group ID is independent of the Java package namespace `io.vyrnforge.platform.kernel`. Wire schemas remain immutable v0.1 (historical draft) and v0.2 (released, manifest 0.2.0). Flyway V1–V3 are unchanged. Do not mix old and new Maven coordinates on a classpath. See [CHANGELOG.md](CHANGELOG.md).
