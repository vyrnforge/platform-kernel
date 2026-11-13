# VyrnForge Platform Kernel

Thin, reusable enterprise foundation shared by VyrnForge products.

> **Status:** early V1 implementation. Public contracts are draft until validated by the first real consumer (Asset Management).

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
| `kernel-core` | Framework-neutral contexts plus EventEnvelope, AuditEvent, FileReference, idempotency, and cross-cutting ports. |
| `kernel-controls` | Product module registry, feature-flag abstraction, and namespaced non-secret configuration primitives. |
| `kernel-testkit` | In-memory adapters for consumer, tenant-isolation, reliability, idempotency, feature/configuration tests. |
| `kernel-observability` | Correlation propagation, privacy-aware telemetry attributes, and health/readiness aggregation. |
| `kernel-http` | Framework-neutral HTTP edge adapter for credential, tenant, correlation, response metadata, and safe error mapping. |
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

## Platform controls

The kernel keeps registration, entitlement, feature activation, configuration, and authorization separate:

- module registry: known technical product/module;
- entitlement: module enabled for a tenant;
- feature flag: implementation feature active for an explicit scope;
- configuration: non-secret namespaced setting for an explicit scope;
- authorization: domain-owned user/resource/action decision.

Feature/configuration keys are namespaced. V1 does not select a feature-flag provider, centralized config service, persistence model, cache, rollout engine, or secret store. See `docs/controls/module-feature-config.md`.

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

The core module deliberately has no Spring, database, broker, IAM SDK, or Asset dependency. HTTP, observability, and controls remain replaceable/framework-neutral layers.

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

Current artifacts use `0.1.0-SNAPSHOT`. Breaking consumer-facing changes require explicit contract versioning and migration guidance.

## License

Apache License 2.0. See `LICENSE`.
