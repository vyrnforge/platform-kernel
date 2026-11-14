# Kernel V2 scope and exit criteria

Historical milestone: V2 was completed in v0.2.0 and hardened in v0.2.1. Validation used the test-only Asset reference consumer, not a deployed Asset product. Later distribution releases do not reopen this milestone.

## In scope

- provider-neutral identity and tenant context;
- API request/correlation/error conventions;
- tenant isolation and domain authorization hook;
- ProductModule registry and tenant entitlement;
- feature/configuration primitives;
- EventEnvelope and reliable publication implementation;
- AuditEvent and durable audit persistence;
- tenant-scoped idempotency persistence;
- observability and health/readiness;
- compatibility/versioning and release hardening;
- Asset reference validation across the above.

## Explicitly deferred

- File Storage client/integration. `FileReference` remains a valid contract, but V2 does not require a File Storage adapter.
- workflow/BPM;
- generic notification platform/preferences;
- generic connector runtime;
- generic custom-field platform unless a concrete consumer proves it;
- AI/automation platform;
- generic policy engine;
- commercial metering/licensing runtime.

## Exit criteria

V2 is complete when:

1. required event/audit intent can be committed atomically with a domain mutation using the V2 adapter;
2. outbox publication supports recovery, bounded retry, duplicate-safe delivery expectations, and terminal failure visibility;
3. idempotency survives restart and enforces tenant isolation + request-fingerprint conflict semantics;
4. Asset reference tests cover the implemented kernel capabilities excluding File Storage;
5. schema migrations and rollback/recovery guidance are documented;
6. protected CI, CodeQL, dependency review, and compatibility checks pass;
7. the repository is released as a pre-1.0 V2 milestone without claiming deferred capabilities are implemented.
