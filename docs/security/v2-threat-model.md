# Kernel V2 threat model

Date: 2026-11-14
Scope: VyrnForge Platform Kernel 0.2.0 release candidate, excluding File Storage integration.

## Assets

- authenticated actor and tenant context;
- tenant isolation boundary;
- module entitlement decisions;
- domain-authorization handoff;
- correlation/request identifiers;
- audit evidence;
- event publication intent;
- idempotency state;
- non-secret configuration;
- telemetry metadata;
- release/build integrity.

## Trust boundaries

1. Untrusted HTTP client -> HTTP edge adapter.
2. Authentication provider/runtime -> validated provider-neutral identity credential.
3. Kernel request context -> owning product/domain authorization.
4. Product transaction -> JDBC reliability adapter.
5. PostgreSQL -> outbox publisher.
6. Outbox publisher -> external event transport.
7. Product/runtime -> telemetry backend.
8. Contributor/PR -> protected CI -> release workflow/package registry.

## Primary threats and controls

### Credential confusion / token disclosure

Raw credentials are extracted but not parsed, normalized into logs, or echoed in errors. Provider-specific credential validation remains outside the kernel. `ValidatedIdentityCredential` contains no raw token.

### Tenant confusion / cross-tenant access

Requested tenant is explicit. Membership validation precedes tenant-scoped product execution. Resource tenant mismatch fails closed and the HTTP adapter maps the reference flow to 404 to reduce disclosure.

### Entitlement mistaken for authorization

The request pipeline checks tenant module entitlement separately from the domain authorization hook. Feature flags/configuration are separate again and are documented as non-security boundaries.

### Header injection / correlation abuse

Header names and values reject CR/LF. Tenant and correlation identifiers must be canonical UUIDv7. Request IDs are freshly generated.

### Audit tampering

V2 persistence records audit evidence in the same transaction as required domain mutation/event intent where composed through `JdbcReliabilityTransaction`. Database migration V2 rejects ordinary UPDATE/DELETE on `platform_audit_event`. Duplicate audit IDs are accepted only when a canonical content fingerprint matches.

Database administrators remain a privileged trust boundary; V2 does not claim cryptographic tamper evidence against a database superuser.

### Event loss / duplicate delivery

Required event intent is stored transactionally. The outbox uses leased claiming, bounded retry, terminal `DEAD` visibility, and at-least-once semantics. A crash after external publish and before local acknowledgement can duplicate delivery; consumers must remain idempotent.

### Sensitive error disclosure

HTTP kernel errors expose stable safe messages. Health probe exceptions become safe codes. Outbox failures persist exception class names only, not exception messages.

### SQL injection

Production JDBC adapter statements use fixed SQL plus prepared parameters. No product-supplied SQL fragment is accepted by the adapter.

### Configuration/secret confusion

`ConfigurationPort` is explicitly non-secret. Credentials/private keys/tokens belong in a secrets manager.

### Telemetry disclosure

Tenant/actor telemetry dimensions are disabled by default and require explicit policy opt-in. Payloads and credentials are not automatically copied into telemetry.

### Supply-chain compromise

Protected CI uses pinned GitHub Actions, least-privilege token permissions, strict Maven checksums, Dependency Review, Dependabot, CodeQL, signed protected-branch commits, and immutable historical contract checks.

## Residual risks accepted for V2

- No File Storage integration review because File Storage is explicitly deferred.
- No cryptographic audit-chain/tamper-evidence against privileged database administrators.
- No broker-specific transport security because no broker is selected.
- Authentication verifier implementation is provider/runtime owned; kernel review covers only the normalized integration boundary.
- Denial-of-service/rate limiting is deployment/product specific and not implemented as a generic kernel limiter.
