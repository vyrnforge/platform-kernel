# VyrnForge Platform Kernel

Thin, reusable enterprise foundation shared by VyrnForge products.

> **Status:** Kernel V2 release candidate — artifact version `0.2.0`. Implementation/security validation is included; publication closes when `v0.2.0` is tagged and the packages are published. File Storage integration is explicitly deferred.

## Principles

- Modular products, unified platform.
- Provider-neutral identity context; native IAM is preferred but not mandatory.
- Explicit tenant context and tenant-isolation checks.
- Tenant-level module entitlement is separate from domain authorization.
- Versioned contracts, UUIDv7 platform identifiers, correlation propagation.
- Domain products own domain data and authorization semantics.
- No mandatory broker, database, workflow engine, or microservice topology.

## Modules

| Module | Purpose |
| --- | --- |
| `contracts` | Phase 0 JSON Schema 2020-12 contracts and examples packaged as resources. |
| `kernel-core` | Framework-neutral contexts, validated-identity integration, EventEnvelope, AuditEvent, FileReference, idempotency, and cross-cutting ports. |
| `kernel-controls` | Product/module registry, feature flags, and namespaced non-secret configuration primitives. |
| `kernel-testkit` | In-memory adapters for consumer, tenant-isolation, reliability, and idempotency tests. |
| `kernel-observability` | Correlation propagation, privacy-aware telemetry attributes, and health/readiness aggregation. |
| `kernel-http` | Framework-neutral HTTP edge adapter for credential, tenant, correlation, response metadata, and safe error mapping. |
| `kernel-persistence-jdbc` | Optional PostgreSQL/Flyway V2 adapter for durable audit, outbox, and idempotency reliability. |
| `consumer-tests/asset-reference` | Test-only Asset reference consumer that validates the kernel from the downstream product side. |

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

These interfaces define semantics and guarantees without selecting Kafka, PostgreSQL, an outbox table, central audit deployment, or File Storage implementation. See `docs/contracts/reliability-semantics.md`.

## Observability and health

`platform-kernel-observability` standardizes business correlation and safe contextual telemetry without selecting a logging or tracing SDK.

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
mvn verify
```

A dependency-free local smoke verifier is also provided:

```bash
bash scripts/verify-core.sh
```

## Versioning

Kernel V2 artifacts use `0.2.0`. Phase 0 `v0.1` remains an immutable historical draft; `v0.2` is the released wire-compatible V2 contract package. Breaking consumer-facing changes require a new contract version plus migration guidance.

## License

Apache License 2.0. See `LICENSE`.
