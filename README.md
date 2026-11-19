# VyrnForge Platform Kernel

**Modular products. Unified platform.** A thin, framework-neutral Java 21 library for adding identity context, access-control plumbing, reliability contracts and observability to **any Java application**. No VyrnForge application, IAM product, shared server, database or broker is required to use the main library.

[Developer documentation website](https://vyrnforge.github.io/platform-kernel/) · [Releases](https://github.com/vyrnforge/platform-kernel/releases) · [Integration guides](https://vyrnforge.github.io/platform-kernel/#/docs/install) · [Apache-2.0](LICENSE)

## Get started

Requires Java 21. Maven Central is the canonical distribution for the organization namespace `io.github.vyrnforge`. [v0.3.2 is published on Maven Central](https://central.sonatype.com/artifact/io.github.vyrnforge/platform-kernel/0.3.2) and verified with an anonymous Maven consumer. No custom Maven repository or credentials are needed. The previous 0.3.0 distribution remains available on GitHub Packages.

| Artifact | Use |
| --- | --- |
| `platform-kernel` | Main runtime: identity/tenancy, HTTP, controls, observability, IDs, event/audit/idempotency contracts and JSON schemas. No production third-party dependencies. |
| `platform-kernel-jdbc` | Optional PostgreSQL/Flyway adapter: atomic mutation + event/audit + idempotency, fenced outbox, migrations. |
| `platform-kernel-testkit` | Test-scope in-memory ports and fixtures. |

See the [published Maven and Gradle installation guide](https://vyrnforge.github.io/platform-kernel/#/docs/install) for exact dependency scopes and coordinates. The parent POM and source/Javadoc archives are metadata/documentation, not extra runtime libraries. Internal reference tests are examples, not runtime dependencies.

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

Start with the [first runnable Java program](https://vyrnforge.github.io/platform-kernel/#/docs/first), including a verified example using only the published main JAR.

## Integration responsibilities

The embedded Kernel offers reusable contracts and mechanics; it does **not** authenticate credentials or authorize domain resources on its own. The consuming application or IAM/IdP first verifies identity, then applies the correct tenant scope, authoritative membership, module entitlement and product-owned resource policy. The public [request integration guide](https://vyrnforge.github.io/platform-kernel/#/docs/request) explains expected denials (400/401/403/existence-safe 404) without exposing an internal decision-execution diagram.

For retriable database writes, the optional JDBC adapter supports an application-owned transaction that commits the domain mutation, required event/audit intents and safe replay result together. Consumers must distinguish ACQUIRED, REPLAY, IN_PROGRESS and CONFLICT, reauthorize every attempt and handle at-least-once outbox delivery with deduplication and recovery. See the [published JDBC integration guide](https://vyrnforge.github.io/platform-kernel/#/docs/jdbc). Products supply their own event transport, telemetry backend and production stores.

## Developer guides — on the website

The [developer documentation](https://vyrnforge.github.io/platform-kernel/#/docs/install) is the primary location for adoption guides, runnable examples and troubleshooting. Use [installation](https://vyrnforge.github.io/platform-kernel/#/docs/install), [first Java program](https://vyrnforge.github.io/platform-kernel/#/docs/first), [trusted requests and tenancy](https://vyrnforge.github.io/platform-kernel/#/docs/request), [optional JDBC reliability](https://vyrnforge.github.io/platform-kernel/#/docs/jdbc) and [consumer verification](https://vyrnforge.github.io/platform-kernel/#/docs/assure). The [Reference](https://vyrnforge.github.io/platform-kernel/#/reference/architecture) explains boundaries and versions; the [single Playground](https://vyrnforge.github.io/platform-kernel/#/playground) shows expected public contract outcomes and consumer checks; it is not a live JVM or internal execution simulator.

The repository's `docs/` tree holds maintainer contracts, change history and operational specifications. These are supporting source/evidence references, not a competing developer guide website. See [contract semantics](docs/contracts/reliability-semantics.md) and [release operations](docs/releases/README.md) when deeper implementation or maintenance context is needed.

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
