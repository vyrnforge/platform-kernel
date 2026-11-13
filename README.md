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
| `kernel-core` | Framework-neutral IDs, Actor/Tenant/Correlation contexts, ports, guards, and request-context pipeline. |
| `kernel-testkit` | In-memory adapters for consumer contract tests and tenant-isolation tests. |
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
  -> response request/correlation metadata
```

The core module deliberately has no Spring, database, broker, IAM SDK, or Asset dependency. The HTTP module is also framework-neutral; Spring/Jakarta/other adapters may wrap it later.

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
