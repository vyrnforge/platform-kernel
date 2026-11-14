# VyrnForge Platform Kernel

**Modular products. Unified platform.** A thin, framework-neutral Java foundation for secure, tenant-aware, reliable enterprise applications.

[Product website / Flow Studio](https://vyrnforge.github.io/platform-kernel/) · [Releases](https://github.com/vyrnforge/platform-kernel/releases) · [Documentation](docs/README.md) · [Apache-2.0](LICENSE)

## Get started

Requires Java 21. Maven Central is the canonical destination for the new organization namespace `io.github.vyrnforge` (first planned Central release: 0.3.1). Check [the release record](https://github.com/vyrnforge/platform-kernel/releases) before selecting a version. The previous 0.3.0 distribution remains available on GitHub Packages.

| Artifact | Use |
| --- | --- |
| `platform-kernel` | Main runtime: identity/tenancy, HTTP, controls, observability, IDs, event/audit/idempotency contracts and JSON schemas. No production third-party dependencies. |
| `platform-kernel-jdbc` | Optional PostgreSQL/Flyway adapter: atomic mutation + event/audit + idempotency, fenced outbox, migrations. |
| `platform-kernel-testkit` | Test-scope in-memory ports and fixtures. |

See [Maven dependencies and migration](docs/integration/three-jar-distribution.md) for exact coordinates. The parent POM and source/Javadoc archives are metadata/documentation, not extra runtime libraries. Asset reference tests are internal.

## How it works

```text
Product HTTP request -> trusted identity -> tenant context
  -> membership -> entitlement -> domain authorization -> product handler
  -> correlation / safe response metadata
```

The kernel consumes a trusted native IAM or external-IdP identity projection; the product owns resource authorization and data. For durable retriable writes, use `JdbcReliabilityTransaction.executeIdempotent`: domain mutation, required event/audit intents and replay result commit together. The outbox is at-least-once compatible, not exactly-once. Products supply the event transport, telemetry backend and production stores.

## Integration guides

- [Identity boundary](docs/integration/identity-boundary.md)
- [HTTP / Asset reference](docs/consumer/asset-reference-http.md)
- [Reliability semantics](docs/contracts/reliability-semantics.md) and [JDBC rollout / recovery](docs/v2/production-hardening.md)
- [Correlation and health](docs/observability/observability-health.md)
- [Release and contributor operations](docs/releases/README.md)

File Storage integration is deferred; `FileReference` is a contract only. No workflow engine, IAM implementation, broker, shared business database or mandatory service topology is included. Real product deployment, load and operational acceptance remain separate.

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
