# Changelog

## 0.2.1 — Kernel V2 production hardening

- Add crash-atomic JDBC mutation and idempotency completion using `executeIdempotent`.
- Fence outbox worker updates with per-claim UUIDv7 tokens; recover expired final attempts as DEAD and expose lost claims.
- Reject tenant-scoped contexts on explicitly tenantless endpoints.
- Add PostgreSQL concurrent retry, lost-response, rollback, stale worker and terminal recovery regression tests; extend HTTP/core negative isolation coverage.
- Add Flyway V3, an additive migration. Stop/drain older publishers before upgrading; mixed old/new publisher versions are unsupported.
- Preserve released v0.2 wire schemas. Existing separate `execute` + `complete` calls remain available but are not crash-atomic.

See `docs/v2/production-hardening.md` for rollout, recovery, security behavior changes and residual deployment requirements.

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
