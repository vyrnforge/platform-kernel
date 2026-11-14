# VyrnForge Platform Kernel

Thin, reusable enterprise foundation shared by VyrnForge products.

> **Status:** source version 0.3.1; public Maven Central distribution setup. See [published releases](https://github.com/vyrnforge/platform-kernel/releases). File Storage integration remains deferred.

Explore the [interactive Kernel Flow Studio](https://vyrnforge.github.io/platform-kernel/#demo) for animated request, mutation, event and operations walkthroughs.

## Principles

- Modular products, unified platform.
- Provider-neutral identity context; native IAM is preferred but not mandatory.
- Explicit tenant context and tenant-isolation checks.
- Tenant-level module entitlement is separate from domain authorization.
- Versioned contracts, UUIDv7 platform identifiers, correlation propagation.
- Domain products own domain data and authorization semantics.
- No mandatory broker, database, workflow engine, or microservice topology.

## Distribution — three physical JARs

| Maven artifact | Usage |
| --- | --- |
| `platform-kernel` | Main runtime: core, HTTP, controls, observability, health and JSON schemas. No third-party runtime dependencies. |
| `platform-kernel-jdbc` | Optional PostgreSQL/Flyway adapter: atomic idempotency, outbox, audit, migrations. |
| `platform-kernel-testkit` | Test scope only: deterministic in-memory ports and fixtures. |

The Maven parent POM is metadata, not a fourth library JAR. Asset reference tests are internal and not published. See [dependency migration and adoption](docs/integration/three-jar-distribution.md) for coordinates and upgrade instructions. The previous v0.2.1 artifacts remain available; do not mix old split JARs with the new distribution.

## Milestone 1 golden path

```text
HTTP request
  -> configurable HTTP edge adapter
  -> credential + requested tenant + correlation
  -> IdentityAdapter
  -> ActorContext
  -> tenant membership guard
  -> module entitlement guard
  -> domain authorization hook
  -> ResolvedRequestContext
  -> structured telemetry context
  -> response request/correlation metadata
```

## Reliability contracts

The kernel exposes transport/storage-neutral contracts for:

- `EventEnvelope<T>` + `EventIntentPort`;
- `AuditEvent` + `AuditIntentPort`;
- `FileReference`;
- tenant-scoped `IdempotencyPort<R>`.

These interfaces define semantics and guarantees without selecting Kafka, PostgreSQL, an outbox table, central audit deployment, or File Storage implementation. See `docs/contracts/reliability-semantics.md`. For retriable JDBC mutations, use `JdbcReliabilityTransaction.executeIdempotent` to commit the acquired result together with domain data and required intents. See `docs/v2/production-hardening.md` for migration and recovery guidance.

## Observability and health

The main JAR's observability package standardizes business correlation and safe contextual telemetry without selecting a logging or tracing SDK.

- business `correlation_id` is preserved across requests/events/jobs;
- each request/consumer invocation receives a fresh `request_id`;
- trace context remains opaque W3C metadata;
- tenant/actor telemetry dimensions require explicit policy opt-in;
- liveness and readiness are separate;
- health probe exceptions are converted to safe machine-readable failure codes.

See `docs/observability/observability-health.md`.

The core module deliberately has no Spring, database, broker, IAM SDK, or Asset dependency. Native IAM or external-IdP authentication middleware validates credentials and can hand the normalized result to `ValidatedIdentityAdapter`; the kernel does not depend on undocumented token claims. The JDBC persistence adapter is optional and replaceable.

The V1 HTTP adapter ships configurable defaults such as `Authorization`, `X-Tenant-Id`, `X-Correlation-Id`, `X-Request-Id`, `traceparent`, and `tracestate`. These are adapter defaults, not permanent architecture invariants.

## Build

Requires Java 21 and Maven 3.9+.

```bash
mvn clean verify
python3 scripts/check-distribution.py
```

A dependency-free local smoke verifier is also provided:

```bash
bash scripts/verify-core.sh
```

## Versioning

Kernel artifacts use `0.3.1`; Maven group ID is `io.github.vyrnforge`. The released wire contract package remains `v0.2` (`0.2.0` schema manifest); no wire contract changes are introduced. Phase 0 `v0.1` remains an immutable historical draft; `v0.2` is the released wire-compatible V2 contract package. Breaking consumer-facing changes require a new contract version plus migration guidance.

## License

Apache License 2.0. See `LICENSE`.
