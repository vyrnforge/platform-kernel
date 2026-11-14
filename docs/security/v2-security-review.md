# Kernel V2 security review

Date: 2026-11-14
Review target: artifact source version 0.2.0
Scope: Kernel V2 per DEC-K013, excluding File Storage.

## Result

**PASS WITH DOCUMENTED RESIDUAL RISKS** for the Kernel V2 release boundary.

This is an internal architecture/code/security review, not an external penetration test or compliance certification.

## Reviewed surfaces

- identity/tenant request pipeline;
- HTTP credential and header handling;
- tenant isolation and cross-tenant resource behavior;
- entitlement vs domain authorization separation;
- feature/configuration boundaries;
- API errors and correlation propagation;
- audit/event/idempotency contracts;
- PostgreSQL/Flyway reliability adapter;
- outbox recovery/retry/dead state;
- telemetry and health handling;
- dependency/build/repository controls;
- contract compatibility/release process.

## Findings closed in release hardening

### SEC-V2-001 — Audit fingerprint could depend on Java/map rendering

Severity: Medium

The earlier JDBC audit duplicate fingerprint included `AuditEvent.toString()`, which could vary with map iteration/rendering despite equivalent semantic changes.

Resolution: fingerprint fields are now serialized explicitly in stable order and `changes` uses the canonical ordered JSON codec. A regression test verifies duplicate semantic content with different map insertion order.

### SEC-V2-002 — Audit table was append-oriented by convention only

Severity: Medium

The V1 JDBC schema allowed ordinary SQL UPDATE/DELETE of persisted audit rows.

Resolution: Flyway V2 adds a database trigger rejecting ordinary UPDATE/DELETE on `platform_audit_event`. Integration tests verify both operations fail.

### SEC-V2-003 — Test identity adapter was the only concrete adapter implementation

Severity: Medium / integration assurance

Resolution: `ValidatedIdentityCredential` + `ValidatedIdentityAdapter` provide the production integration boundary for upstream-authenticated native IAM or external-IdP identities without importing provider-specific token shapes. Raw credential validation remains with the authentication provider/runtime.

## Verified security properties

- credentials are not echoed in kernel errors;
- duplicate security-sensitive HTTP headers fail closed;
- tenantless requests are rejected where tenant scope is required;
- tenant membership and resource tenant checks are explicit;
- entitlement is not treated as domain authorization;
- feature flags are not treated as authorization;
- required event/audit intent can commit atomically with a domain mutation;
- event publication retries are bounded and failures become visible;
- outbox persisted failure data excludes exception messages;
- audit rows are append-only against ordinary application mutation;
- persisted idempotency is tenant scoped and detects key/fingerprint conflict;
- telemetry identity dimensions default off;
- health exceptions are sanitized;
- historical v0.1 contracts are immutable;
- protected CI includes CodeQL and dependency review.

## Residual/operational requirements

- production database roles must follow least privilege and should not grant table-owner/superuser privileges to the application runtime;
- database backups/encryption/retention are deployment responsibilities;
- event transports must add their own TLS/authentication/signing controls;
- native IAM/external IdP verifiers must validate credentials before constructing `ValidatedIdentityCredential`;
- telemetry backends must enforce access/retention appropriate to any opted-in tenant/actor dimensions;
- production rate limits are product/deployment specific.

## Release recommendation

Security review does not block V2 release after the hardening changes pass protected CI. File Storage remains outside this review by explicit V2 scope.
