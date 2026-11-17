# Changelog

## 0.4.0 — Foundation quality, compatibility and developer experience

- Align `IdempotencyRequest` operation/key/fingerprint length limits to existing PostgreSQL V1 columns (192/512/512 Unicode code points), rejecting previously overlength inputs before persistence.
- Apply the released v0.2 entitlement module-key grammar consistently to the product module registry and tenant-scoped endpoint policy; previously valid namespaced keys may now be accepted by the registry and invalid endpoint keys fail earlier.
- Add authenticated tenantless pipeline composition with fail-closed tenant-scoped and tenant-owned-resource behavior. Keep trusted identity verification and product resource authorization mandatory.
- Add an optional application-configured Jackson `ObjectMapper` constructor to the JDBC codec; preserve the original default, copy configuration defensively and keep stored-payload encoding distinct from public wire JSON serialization.
- Clarify safe crash-atomic `begin` + `executeIdempotent` usage, host-owned Flyway migration coexistence, HTTP duplicate-header handling, synchronous health-probe timeout responsibility and Java source hygiene.
- Extend negative tests, real PostgreSQL host-coexistence tests and the golden-path examples without introducing runtime services or mandatory product dependencies.
- Preserve Java 21, the same three Maven artifacts and Java package names, the dependency-free core, immutable released v0.1/v0.2 JSON contracts and unchanged Flyway V1–V3. No product application is automatically upgraded.
- Upgrade note: stricter invalid-input rejection can surface errors earlier; verify module-key assumptions, idempotency boundary inputs, historical JDBC replay/serialization compatibility, tenant authorization and host migration authority before adoption. See [release-readiness and acceptance gates](docs/releases/v0.4.0-readiness.md).
- Release status: this entry is prepared on the release-candidate branch; publishing requires separate explicit Product Owner authorization.


## 0.3.2 — Integrity and consumer compatibility

- Versioned structured intent fingerprints with persisted-content verification for historical duplicate replay; drain old intent writers before rollout.
- Reject inconsistent audit tenant ownership, future effective entitlement decisions and invalid runtime contract fields; preserve released v0.1/v0.2 schemas and existing migrations.
- Add real File Storage FS-100A compatibility gate using an isolated Maven repository and a pinned consumer source revision.
- Preserve three physical JARs and Java package names. See `docs/v2/audit-remediation.md` for upgrade constraints.

## 0.3.1 — Maven Central distribution

- Move Maven coordinates to the verified organization namespace `io.github.vyrnforge`; Java imports and APIs are unchanged.
- Generate sources and Javadoc archives, sign the four POMs and nine JARs, and publish approved releases to Maven Central and GitHub Packages.
- Preserve all three runtime/test libraries, wire schemas, migrations and v0.3.0 artifacts. No new runtime capabilities.
- See `docs/releases/central-publication.md` for release and recovery procedures.

## 0.3.0 — Three-JAR distribution

- Physically consolidate core, HTTP, controls, observability and JSON schemas into `platform-kernel`.
- Rename the optional JDBC artifact to `platform-kernel-jdbc`; retain `platform-kernel-testkit` as a test dependency.
- Preserve existing Java fully qualified names, immutable wire schemas and JDBC V1–V3 migrations. No functional changes.
- Verify physical JAR contents, no duplicate or embedded third-party classes, packaged Java consumer smoke, and the full existing test suite.
- Old Maven coordinates require migration; v0.2.1 remains immutable. See `docs/integration/three-jar-distribution.md`.


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
