# Changelog

## 0.2.0 — Kernel V2 milestone

Kernel V2 completes the thin cross-product foundation and validates durable reliability with Asset Management.

### Added

- provider-neutral request/tenant context and HTTP adapter;
- UUIDv7 identifiers, API errors and correlation propagation;
- ProductModule registry, tenant entitlement separation, feature flags and namespaced non-secret configuration;
- EventEnvelope, AuditEvent, FileReference contract and tenant-scoped idempotency semantics;
- privacy-aware observability and liveness/readiness primitives;
- PostgreSQL/Flyway JDBC reliability adapter;
- atomic domain mutation + event/audit intent composition;
- durable event outbox with claim/retry/dead-state recovery;
- durable append-oriented audit persistence;
- persisted idempotency replay/conflict semantics;
- immutable v0.1 contract compatibility baseline;
- end-to-end Asset V2 reference validation.

### Explicitly deferred

File Storage integration is not part of V2. The FileReference contract remains available, but no File Storage adapter/client is shipped.

Workflow/BPM, generic notifications, generic connector runtime, generic custom fields, AI/automation, generic policy and commercial metering remain deferred unless separately approved.
