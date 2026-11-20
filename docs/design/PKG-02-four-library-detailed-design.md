# PKG-02 — Detailed Design for Four Embedded Platform Kernel Libraries

**Status:** PROPOSED TECHNICAL DESIGN — not approved to relocate Java classes, change Maven artifacts, or publish a release  
**Date:** 2026-11-20  
**Baseline:** protected main at 706db703ea2a2e98f036d397b9e7d1e7f75291a0; published immutable v0.3.2  
**Parent proposal:** PKG-01, GitHub issue #130 and proposed ADR-0005  
**Review:** Product Owner, Platform Architecture, API owner, File Storage/Asset consumers, Security/QA and Release owner

## 1. Design decision and constraints

Keep the approved **G1–G8 capability catalogue** independent of Maven artifact boundaries. Use four potential libraries by dependency nature, not by commercial feature:

1. **platform-kernel-contracts:** stable API types, provider ports, opaque identifiers, pure utility implementations and canonical portable wire resources.
2. **platform-kernel:** embedded runtime composition, HTTP bridge, normalized validated-identity projection, correlation/telemetry and health.
3. **platform-kernel-jdbc:** opt-in PostgreSQL/JDBC reliability implementation including the current three Flyway migrations.
4. **platform-kernel-testkit:** test-only, deterministic fake providers and consumer conformance fixtures.

This is NOT four microservices. There is no independently hosted Kernel service, IAM replacement, File Storage owner, data bus or generic workflow engine.

The approved source topology is currently three distributed JARs (DEC-K022). DEC-K039 only reclassified the catalogue; it does not approve extraction. A fourth artifact **requires a new, explicit Product/Architecture decision superseding only the three-JAR packaging part of DEC-K022**, evidence of consumer benefit, and a new versioned release. This design alone does not constitute that decision.

## 2. Proposed module graph and dependency contract

Target source layout under the existing Maven parent:

    pom.xml                             platform-kernel-parent
    platform-kernel-contracts/          NEW (proposed)
      pom.xml
      src/main/java/io/vyrnforge/platform/kernel/{contract-level packages}
      src/main/resources/contracts/phase0/{v0.1,v0.2}/
    platform-kernel/                    EXISTING Maven artifact
      pom.xml
      src/main/java/io/vyrnforge/platform/kernel/{runtime packages}
    kernel-persistence-jdbc/            EXISTING folder, Maven artifact platform-kernel-jdbc
      pom.xml
      src/main/java/io/vyrnforge/platform/kernel/persistence/jdbc/
      src/main/resources/db/migration/V1__... through V3__...
    kernel-testkit/                     EXISTING folder, Maven artifact platform-kernel-testkit
      pom.xml
      src/main/java/io/vyrnforge/platform/kernel/testkit/
    consumer-tests/asset-reference/     TEST-ONLY, NOT PUBLISHED

Strict semantic dependency direction:

    application composition
        -> platform-kernel (embedded runtime) -> platform-kernel-contracts
        -> platform-kernel-jdbc (optional technical adapter) -> contracts
        -> platform-kernel-testkit (test scope only) -> contracts
    External IAM / File Storage / Asset / ITSM implement their OWN authority.

**Stage-1 binary-consumer compatibility:** retain the existing Maven dependency from platform-kernel-jdbc and platform-kernel-testkit to platform-kernel *in addition to any explicit contracts dependency*. This preserves the existing transitive runtime classpath for consumers that currently declare only JDBC or testkit. It adds no new required JDBC dependency for core consumers; JDBC is still opt-in. A later removal of those compatibility edges needs evidence and a separate versioned decision.

Do not introduce contracts -> platform-kernel, contracts -> JDBC, runtime -> JDBC, production -> testkit, or kernel -> business-domain imports. No new product-owned tables or cross-product database joins.

All four Maven artifacts use groupId io.github.vyrnforge, the same future **approved version**, Java release 21 and immutable publication semantics. Do not keep development build coordinates at published v0.3.2 for a new public release.

## 3. Exact class and package ownership

Preserve ALL Java FQCNs under io.vyrnforge.platform.kernel. Move entire packages, never a half-package across two JARs. Compile and inspect all 88 existing production-packaged Java source files.

### 3.1 Contracts library — 41 Java files in 12 existing packages

| Java subpackage | Files | Public class names |
|---|---:|---|
| audit | 3 | AuditEvent, AuditIntentPort, AuditOutcome |
| config | 2 | ConfigurationKey, ConfigurationPort |
| context | 11 | ActorContext, ActorReference, ActorType, AuthenticationContext, AuthorizationProjection, CorrelationContext, IdentityReference, ModuleEntitlement, ResourceReference, TenantContext, TenantScope |
| controls | 1 | NamespacedKey |
| errors | 4 | ApiError, FieldError, KernelAccessException, KernelFailure |
| event | 2 | EventEnvelope, EventIntentPort |
| feature | 2 | FeatureFlagKey, FeatureFlagPort |
| file | 1 | FileReference |
| idempotency | 6 | IdempotencyDecision, IdempotencyDecisionType, IdempotencyLease, IdempotencyPort, IdempotencyReplay, IdempotencyRequest |
| ids | 1 | UuidV7 |
| module | 4 | ModuleKeys, ProductModule, ProductModuleRegistry, StaticProductModuleRegistry |
| ports | 4 | DomainAuthorizationHook, IdentityAdapter, ModuleEntitlementPort, TenantMembershipPort |
| **Total** | **41** | No duplicate binary class names in any other artifact |

Ownership: immutable logical identifiers, normalized actor/tenant/reference DTOs, declared provider interfaces, module identity and pure in-memory module registry, config/feature/entitlement ports, idempotency API, event/audit intent contracts, safe error DTOs. **No production third-party dependencies**; only JDK 21. A PORT is not an implementation or a live authority.

Important edges: context.ModuleEntitlement imports module.ModuleKeys; keep BOTH packages here. AuditEvent/EventEnvelope/IdempotencyRequest reference IDs/context. StaticProductModuleRegistry and UuidV7 are small pure helpers, so the term "contracts" includes portable pure code, not exclusively interfaces.

Boundary invariants: a contracts source may import JDK classes and classes within these 12 packages but must not import runtime packages, JDBC, HTTP framework/server, Spring, Testcontainers, product domains or testkit. The ABI/behavior of currently published DTOs and interfaces must be verified; six main-versus-v0.3.2 constructor differences remain separately gated.

### 3.2 Core runtime library — 24 Java files in 5 existing packages

| Java subpackage | Files | Public class names |
|---|---:|---|
| health | 6 | HealthAggregator, HealthProbe, HealthSnapshot, ProbeResult, ProbeStatus, ProbeType |
| http | 9 | BearerTokenCredentialExtractor, HttpContextException, HttpCredentialExtractor, HttpErrorResponse, HttpHeaderConfiguration, HttpKernelErrorMapper, HttpRequestContextAdapter, HttpRequestMetadata, HttpResponseMetadata |
| identity | 2 | ValidatedIdentityAdapter, ValidatedIdentityCredential |
| observability | 3 | CorrelationPropagation, TelemetryAttributePolicy, TelemetryAttributes |
| pipeline | 4 | EndpointPolicy, RequestContextInput, RequestContextPipeline, ResolvedRequestContext |
| **Total** | **24** | Existing platform-kernel artifact name preserved |

Responsibility: compose verified upstream identity, requested tenant, membership, effective module availability and product-owned domain authorization into a fail-closed in-process request decision; adapt generic HTTP request metadata and safe errors; propagate correlation; aggregate product-owned health probes. Not a servlet server, JWT/JWKS issuer/verifier, remote feature-flag server, telemetry backend or SLO monitor.

Runtime depends on contracts and the JDK, with no new mandatory third-party production dependency. HealthAggregator remains synchronous; a blocking product probe needs a product-owned deadline/executor policy. HttpRequestContextAdapter may depend on pipeline and observability, both runtime-level. TelemetryAttributes references ResolvedRequestContext: do not try to put the whole observability package in contracts without first changing that dependency.

Main-only ValidatedIdentityAdapter and RequestContextPipeline.tenantless APIs must not be silently described as already published v0.3.2 APIs.

### 3.3 JDBC library — 14 Java files, 3 immutable migrations

Existing package: io.vyrnforge.platform.kernel.persistence.jdbc. Preserve file/class names:
EventTransport, IdempotencyResultCodec, IntentFingerprint, JacksonRecordCodec, JdbcAuditIntentPort, JdbcAuditIntentWriter, JdbcEventIntentPort, JdbcEventIntentWriter, JdbcIdempotencyPort, JdbcOutboxPublisher, JdbcReliabilityTransaction, KernelJdbcMigrator, OutboxPublishResult, SqlSupport.

Scope: optional DataSource-backed transactional replay and intent persistence; JDBC transaction composition, event/audit intent adapters, outbox batch publication with at-least-once semantics, migration integration and serialization codec. Keep current Flyway filenames, paths and bytes under db/migration/V1__kernel_reliability.sql, V2__audit_append_only.sql and V3__outbox_claim_fencing.sql.

External dependencies remain scoped to this adapter: Flyway, PostgreSQL driver and Jackson; PostgreSQL Testcontainers stays test-only. SQL schema, transaction/migration ordering, lease fencing, retry and dead-letter behavior must not change merely because the upstream contract class is now in a different JAR. The consumer owns DataSource, host Flyway history/invocation, domain SQL, transaction boundaries, broker/receiver duplicate suppression, operator re-drive and restore.

Safety: authorization MUST be checked before begin/replay; API IdempotencyPort alone is not atomic with independently committed business data. JdbcReliabilityTransaction must compose the domain mutation with mandatory audit/event intents and replay result in one transaction; do not claim exactly-once broker delivery or fully authoritative compliance evidence.

For first compatible extraction, retain JDBC -> platform-kernel Maven dependency to protect existing transitive consumer classpaths; direct contracts dependency is permitted if version-aligned. Remove extra runtime dependency only under a later reviewed compatibility change. No service/background scheduler is created.

### 3.4 Testkit — 9 Java files, test-only publication

Existing package io.vyrnforge.platform.kernel.testkit:
InMemoryAuditIntentPort, InMemoryConfigurationPort, InMemoryEventIntentPort, InMemoryFeatureFlagPort, InMemoryIdempotencyPort, InMemoryModuleEntitlementPort, InMemoryTenantMembershipPort, PermissionAuthorizationHook, StaticIdentityAdapter.

Scope: deterministic fake ports, tenant and authorization negative scenarios, replay and entitlement test fixtures, consumer test composition. Do not use these as production identity verifiers, authorization authorities, SQL persistence or audit evidence stores. Consumer applications must declare platform-kernel-testkit with Maven scope **test**, not production/compile. Keep its transitive platform-kernel dependency initially for compatibility; refine only after consumer tests and a versioned decision.

Repository-only fixture modules and conformance scripts remain test infrastructure, not a fifth published Java library.

## 4. Public contract semantics and product ownership

| Contract/service surface | What the Kernel guarantees | Authoritative owner / what Kernel must not do |
|---|---|---|
| IdentityAdapter / ValidatedIdentityAdapter | Normalizes a previously verified credential and actor context and composes verified-request context | IAM/IdP actually verifies token, expiry, issuer, audience, keys; products confirm domain permission |
| TenantMembershipPort | Defines explicit membership lookup; fail-closed pipeline decisions | Product/IAM membership authority, freshness, tenant SQL isolation |
| DomainAuthorizationHook | Requests a product-owned resource/action decision | Asset, ITSM and File Storage own authorization policy and resource tenancy |
| ModuleEntitlementPort / ProductModuleRegistry | Stable module identity and current availability input | Provider owns entitlements and revocation; commercial licensing and product permissions separate |
| FeatureFlagPort / ConfigurationPort | Namespaced feature/config lookups | Provider owns configuration; flags are NOT permission grants or secrets management |
| EventIntentPort | Durable intent handoff per implementation's guarantees | Business domain owns event meaning, broker/receiver owns delivery and dedup |
| AuditIntentPort | Required audit intent handoff per implementation's guarantees | Domain/regulated evidence store owns legal retention and authoritative trail |
| IdempotencyPort | Tenant-scoped acquire/replay/in-progress/conflict interface | Product reauthorizes request and replay; JDBC adapter handles atomic storage if adopted |
| FileReference | Stable reference to externally stored object | File Storage owns bytes, grants, content lifecycle and revocation |
| Health / telemetry | Pure in-process aggregation and safe attribute conventions | Product owns probe deadlines and telemetry exporters/monitoring |

No kernel business database table may become a shared integration shortcut between Asset, ITSM, IAM and File Storage. Cross-domain references remain stable IDs with API/events, not cross-product joins.

## 5. Portable resource ownership and migration

**Recommended target:** the contracts artifact owns the current 26 portable JSON schema/manifest/example resources as ONE canonical classpath resource set, preserving their exact resource paths and byte digests:
- contracts/phase0/v0.1/ (13 files)
- contracts/phase0/v0.2/ (13 files)

No duplicate copies of these resource paths in both contracts and runtime JARs. Existing runtime consumers using the normal aggregated Maven classpath should resolve the same paths transitively, but the **physical JAR containing each resource changes**. Direct inspection of platform-kernel.jar or custom child-first classloaders may break. Before moving any resource, inventory and test ClassLoader.getResourceAsStream, Class.getResourceAsStream, JarFile direct lookup, generated sources/Javadoc, manifests, and consumers that download resources by Maven coordinates. If a real supported client requires JAR-local packaging in the original core, resolve via a documented compatibility strategy/decision or **defer the resource move and physical split**. Do not hide a break by silently duplicating canonical resource files.

No historical v0.1/v0.2 schema bytes, published wire grammar, event shapes or resource filenames may change. Future resource versions are additive under versioned directories. JDBC keeps the exact 3 Flyway SQL paths and digests in the JDBC artifact; no migration replay or shared product schema adoption is authorized.

## 6. Maven and versioning detailed design

Target parent reactor order:
1. platform-kernel-contracts
2. platform-kernel
3. kernel-persistence-jdbc
4. kernel-testkit
5. consumer-tests/asset-reference (test-only, not installed/deployed)

All modules inherit a single approved parent version and Java 21. Keep existing published artifact IDs. Newly proposed artifact ID is platform-kernel-contracts. A Maven user requiring only identifiers/ports can declare contracts directly once a future version is published. A current Maven user declaring platform-kernel should continue to receive all runtime+contracts classes via transitivity, without changing imports/FQCNs. A JDBC-only user's previous transitive runtime access is preserved in the first release via the existing JDBC -> platform-kernel edge. Do not make JDBC a platform-kernel dependency or testkit a runtime dependency.

Examples (version placeholder is not a release authorization):

    <dependency>
      <groupId>io.github.vyrnforge</groupId>
      <artifactId>platform-kernel-contracts</artifactId>
      <version>FUTURE_APPROVED_VERSION</version>
    </dependency>

    <dependency>
      <groupId>io.github.vyrnforge</groupId>
      <artifactId>platform-kernel</artifactId>
      <version>FUTURE_APPROVED_VERSION</version>
    </dependency>

    <dependency>
      <groupId>io.github.vyrnforge</groupId>
      <artifactId>platform-kernel-jdbc</artifactId>
      <version>FUTURE_APPROVED_VERSION</version>
    </dependency>

    <dependency>
      <groupId>io.github.vyrnforge</groupId>
      <artifactId>platform-kernel-testkit</artifactId>
      <version>FUTURE_APPROVED_VERSION</version>
      <scope>test</scope>
    </dependency>

Do not accidentally publish the non-deployable asset-reference test module. The release staging inventory, POM signing, sources/Javadoc generation, Maven Central coordinates, GitHub packages and release asset SHA manifest must explicitly handle **four** distributed artifacts if option B is approved. No republishing v0.3.2. Publication/recovery PR #129 is still separate draft governance and not yet an approved release.

## 7. Behavior and failure-path design

### Trusted HTTP request
1. Host authenticates token with its authoritative IAM/IdP adapter, including issuer/audience/expiry/key freshness; credential extraction is not verification.
2. Runtime receives trusted normalized identity, active tenant request and endpoint policy; tenantless does not imply tenant resource access.
3. Runtime composes TenantMembershipPort and ModuleEntitlementPort with explicit domain-owned DomainAuthorizationHook.
4. Missing provider result, incorrect tenant, invalid module, invalid identity, revoked permission or domain denial results in a safe, stable HTTP error; adapter must not leak raw token or secrets.
5. Host executes authorized domain mutation and optional JDBC transaction; no cross-domain shared SQL.
6. Produce correlation, telemetry and audit intent without leaking sensitive claims.

### Idempotent durable mutation
1. Product verifies identity and **re-authorizes the current actor and resource before replay**.
2. Call IdempotencyPort.begin with tenant and fingerprint; handle acquired/replay/in-progress/conflict without treating a key as permission.
3. For JDBC adoption, use JdbcReliabilityTransaction.executeIdempotent to atomically commit domain mutation, replay result, required event/audit intents.
4. Outbox publisher retries at least once; consumers must deduplicate by stable event ID. Late stale leases may not overwrite newer claims. Product owns transport outage and recovery operations.

### Failure ownership
- IAM/JWKS unreachable or stale: provider-specific fail closed, not a Kernel credential bypass.
- Membership/entitlement source unavailable: reject protected operation; no permissive fallback.
- Audit/event intent persistence failure in required same-transaction path: do not acknowledge a successful durable mutation without its required intent.
- Blocking health probe: host must bound execution or readiness endpoint can block.
- SQL transaction/outbox crash: retain existing fencing/rollback/retry semantics; schema not changed by packaging.

## 8. Compatibility proof and release acceptance matrix

| Gate | Required result | Owner/evidence |
|---|---|---|
| Class inventory | All 88 classes allocated once; contracts 41, runtime 24, JDBC 14, testkit 9; 0 duplicate FQCN or Java split packages | Architecture + CI tree/class scanner |
| Dependency architecture | Contracts cannot import runtime/JDBC/testkit/product; runtime cannot import JDBC/testkit; no Maven cycles; JDBC and testkit remain opt-in | Architecture + Maven enforcer/consumer dependency tree |
| JVM linkage | Aggregate future runtime + contracts classpath provides all previously published exported descriptors from v0.3.2; no missing public type | CAPAUD-01 revised aggregate ABI probe, Java21 |
| Behavioral contract | All six existing constructor behavior differences explicitly retained/reworked with migration evidence and signed API decision | Product/API + QA, CAPAUD-01 #119 |
| Wire resources | 26 identical path/digest JSON resources, one canonical owner; test classloader paths and actual supported JarFile uses | API consumer tests |
| JDBC | Three SQL files path/digest identical; atomic transaction, replay, outbox fencing/recovery, Testcontainers Postgres pass | JDBC/QA |
| Consumer Maven | Legacy platform-kernel and JDBC dependency flows compile/run without import changes; direct contracts-only consumer compiles | File Storage and Asset/reference consumer |
| Runtime security | Current deployed IAM verify/revocation and product tenant/grants rejections witnessed; no testkit in prod | Product/IAM/Storage Security |
| Operational | Backup/restore, RPO/RTO, outbox re-drive, artifact rollback/pin tested | Operations + Security |
| Publication | Four JARs, POM, sources/Javadoc, signatures, hashes, Central immutability, anonymous resolution | Release owner, separate approval |

The existing single-JAR CAPAUD-01 JVM scanner would report moved contract classes as removed from platform-kernel.jar; it must be **replaced with a cross-artifact aggregate classpath comparison that still fails closed**, not suppressed. Regression proof includes a synthetic Maven consumer compiled against the released v0.3.2 core and executed against the new effective classpath, plus a direct contracts-only sample and a legacy JDBC-only dependency sample.

## 9. Staged implementation plan with stop conditions

**D0 — Detailed architecture approval:** Product/Architecture accepts or rejects a new fourth JAR; explicitly records change against DEC-K022. No Java modifications at this stage. Confirm consumer and operations benefit first.

**D1 — Physical extraction (reviewable draft):** introduce Maven contracts module, relocate 41 entire-package Java source files and 26 canonical JSON resources with unchanged paths/bytes, add aligned dependencies, update reactor/release inventory. Keep the other 47 Java files in existing modules. Keep FQCNs intact. No database SQL edits.

**D2 — Static and integration validation:** run no-duplicate/no-cycle rule, contracts-only compile, effective aggregate JVM ABI/constructor probe, resource/digest checks, JDBC PostgreSQL tests, published and candidate File Storage consumer checks, Asset reference and any actual ITSM consumer. If direct-JAR/resource consumers break, document a migration strategy with owner acceptance or abandon the extraction.

**D3 — Human security/compatibility/operational acceptance:** resolve the six CAPAUD-01 deltas, collect real provider and grant revocation evidence, independently review optional JDBC reliability, execute restore/RPO/RTO and clarify exceptions. CI success alone cannot satisfy these.

**D4 — Separate release decision:** approve future version, protected PR merge and four-artifact publication/recovery. Keep existing v0.3.2 immutable and available as rollback pin until migration is accepted.

**Stop/rollback:** stop for any missing exported type on aggregate classpath, changed contract/migration byte, duplicate classes/resources, forced JDBC or testkit inclusion for core, insecure default, unverifiable resource loading, or major unapproved consumer break. Roll back the development refactor branch, not the immutable released v0.3.2 artifact.

## 10. Tradeoffs, open decisions and recommendation

**Benefits:** explicit minimal contracts consumption, stable dependency direction, more reviewable ownership, less accidental runtime coupling for future Asset and ITSM consumers.

**Costs:** one additional published artifact and release signing/recovery burden; new transitive dependency and classloader/resource behavior; source/Javadoc split; more compatibility tests; current core has no production third-party dependencies, so benefit is *not* smaller framework overhead today.

Open D-1: Is a fourth JAR worth the ecosystem cost? Need at least two real independently observed consumer needs or an approved equivalent justification.  
Open D-2: Does supported JarFile-level resource lookup require old core JAR resource placement? If yes, stop/approve migration or stay with three JARs.  
Open D-3: Should JDBC/testkit drop their historic transitive core dependency? **No for first release**; revisit with independent consumers later.  
Open D-4: Is any future non-JVM contract SDK justified? Not in this design.  
Open D-5: Which future version/review exception will govern six constructor deltas? Unresolved in CAPAUD-01; no guessed version.  
Open D-6: Who signs deployed IAM/Storage and restore evidence? Product and independent Security/Operations; not the package design authors.

**Recommendation:** Keep PKG-01 Option A (three JARs + boundary CI) as the safe, immediately actionable state. Treat this four-library document as a detailed Option B design blueprint. Implement D1 only after a new recorded Product/Architecture decision and consumer-value evidence. Do not implement eight physical libraries or services.

## 11. Traceability and sources

- PKG-01 architecture decision: https://github.com/vyrnforge/platform-kernel/issues/130
- PKG-01 boundary draft: https://github.com/vyrnforge/platform-kernel/pull/131
- G1–G8 consumer catalogue: approved DEC-K039 in canonical Decision & Change Log
- Packaging precedent: DEC-K022 (three artifacts), retained until superseded
- CAPAUD-01 behavior/ABI: https://github.com/vyrnforge/platform-kernel/issues/119
- CAPAUD-03 real-provider security: https://github.com/vyrnforge/platform-kernel/issues/121
- CAPAUD-04 consumer source evidence: https://github.com/vyrnforge/platform-kernel/issues/122
- Draft new release-acceptance workflow: https://github.com/vyrnforge/platform-kernel/pull/129
- Source baseline: https://github.com/vyrnforge/platform-kernel/tree/706db703ea2a2e98f036d397b9e7d1e7f75291a0

**Document status:** detailed PROPOSAL ONLY. Does not approve four-JAR publication, Java movement, new SQL, a fourth live service, or any bypass of protected release gates.


## 12. PKG-02 v2 — Detailed component catalog and database connector policy

**Revision:** 2026-11-20, component-scope clarification requested by Product Owner. **Status:** DESIGN PROPOSAL; this section clarifies and supersedes broad responsibility descriptions above, but does not authorize new code, a fourth published JAR, or any database other than existing PostgreSQL. All catalog entries use three status labels: **IMPLEMENTED ON CURRENT MAIN**, **PROPOSED PACKAGING** (physical relocation only), or **FUTURE CANDIDATE** (not implemented).

### 12.1 Library A — platform-kernel-contracts (proposed new fourth published artifact)

**Purpose:** portable Java 21 API vocabulary shared by products that must not depend on request runtime or database technology. Existing source implementation: **41 Java classes** residing today inside the published-name \`platform-kernel\` core; the *standalone contracts JAR is not implemented*. Proposed public artifact: \`io.github.vyrnforge:platform-kernel-contracts:<approved-version>\`. The contract includes pure helpers where required, not merely interfaces.

| Component | Functionality to own | Exact current Java surface | Status / guardrails |
| --- | --- | --- | --- |
| **C-A Context & tenant vocabulary** | Actor, tenant, identity and authentication projections, tenant scope, correlation and cross-product references; no authentication | Whole \`context\` package: 11 classes, \`ActorContext\`, \`TenantContext\`, \`AuthenticationContext\`, \`AuthorizationProjection\`, \`ActorReference\`, \`IdentityReference\`, \`ResourceReference\`, \`TenantScope\`, \`CorrelationContext\`, \`ActorType\`, \`ModuleEntitlement\` | Implemented main; IAM/IdP remains identity authority; no JWT signing/validation |
| **C-B Portable IDs & references** | UUIDv7, cross-product file pointer and configuration namespace key utility | \`ids.UuidV7\`, \`file.FileReference\`, \`controls.NamespacedKey\`: 3 classes | Implemented main; file bytes and access grants remain File Storage-owned |
| **C-C Public error contract** | Stable, safe error/value model for HTTP or other adapters; no wire-server implementation | Whole \`errors\` package: \`ApiError\`, \`FieldError\`, \`KernelAccessException\`, \`KernelFailure\` (4) | Implemented main; HTTP status translation lives in Core |
| **C-D Provider and authorization ports** | Authenticate through a provider-owned port, membership, current entitlement and product-domain authorization decision | Whole \`ports\` package: \`IdentityAdapter\`, \`TenantMembershipPort\`, \`ModuleEntitlementPort\`, \`DomainAuthorizationHook\` (4) | Implemented main; a port is NOT an implemented IAM/client/provider |
| **C-E Modules & entitlement names** | Module identity grammar, module registry abstraction and pure static registry | Whole \`module\` package: \`ModuleKeys\`, \`ProductModule\`, \`ProductModuleRegistry\`, \`StaticProductModuleRegistry\` (4) | Implemented main; no hosted licensing service or entitlement authority; maintain existing validator behavior gates |
| **C-F Configuration & feature contract** | Namespaced configuration and flags; distinguish feature activation from authorization | \`config.ConfigurationKey\`, \`ConfigurationPort\`; \`feature.FeatureFlagKey\`, \`FeatureFlagPort\` (4) | Implemented main; no hosted config/secret store, flags never act as permissions |
| **C-G Events & audit intents** | Versioned domain-neutral event envelopes; audit evidence intents and outcomes; no broker, record store or scheduler | \`event.EventEnvelope\`, \`EventIntentPort\`; \`audit.AuditEvent\`, \`AuditIntentPort\`, \`AuditOutcome\` (5) | Implemented main; meanings distinct even if grouped in G6 |
| **C-H Idempotency SPI** | Tenant-scoped begin/lease/replay/complete/abort result vocabulary | \`idempotency.IdempotencyRequest\`, \`IdempotencyPort\`, \`IdempotencyDecision\`, \`IdempotencyDecisionType\`, \`IdempotencyLease\`, \`IdempotencyReplay\` (6) | Implemented main; keys never authorize replay; durable implementation lives in JDBC |
| **C-I Versioned wire assets** | Portable published JSON schemas, examples and manifests | 26 files: 13 at \`contracts/phase0/v0.1/\` and 13 at \`contracts/phase0/v0.2/\` | Existing resources physically in core; moving to contracts is PROPOSED, requires byte-identical paths and actual classloader/JarFile compatibility evidence |

**Contracts total = 11 + 3 + 4 + 4 + 4 + 4 + 5 + 6 = 41 Java source files**. C-I resources are not Java files. Proposed contracts dependencies: **JDK 21 only**. Forbidden: imports on \`http\`, \`pipeline\`, \`identity\`, \`observability\`, \`health\`, \`persistence.jdbc\`, testkit, framework SDK, IAM implementation or domain DB.

### 12.2 Library B — platform-kernel (retained embedded runtime, 24 Java classes)

**Purpose:** in-process request/security composition and technology-neutral HTTP/operability adapters. Existing published artifact coordinates remain \`io.github.vyrnforge:platform-kernel\`. Physical separation from contracts remains **proposed**; all 24 runtime classes already exist on main.

| Component | Owns and performs | Exact Java classes | Not owned |
| --- | --- | --- | --- |
| **K-A Identity bridge** | Typed validated-credential projection and provider integration | \`identity.ValidatedIdentityAdapter\`, \`ValidatedIdentityCredential\` (2) | Credential issuer, JWKS provider, external cryptographic verification |
| **K-B Endpoint policy declaration** | Declares whether tenant is required and module/resource policy | \`pipeline.EndpointPolicy\` (1) | Product authorization rules or membership source |
| **K-C Request/authorization pipeline** | Composes actor, tenant membership, current entitlement and product-owned domain hook; rejects invalid/tenantless/cross-tenant conditions | \`pipeline.RequestContextInput\`, \`RequestContextPipeline\`, \`ResolvedRequestContext\` (3) | Persisted domain resource access or permissive fallback |
| **K-D HTTP transport integration** | Extracts bearer credentials safely, selects configured headers, maps incoming/outgoing HTTP metadata to the pipeline | \`http.BearerTokenCredentialExtractor\`, \`HttpCredentialExtractor\`, \`HttpHeaderConfiguration\`, \`HttpRequestContextAdapter\`, \`HttpRequestMetadata\`, \`HttpResponseMetadata\` (6) | HTTP server, REST controller framework, middleware installation by itself |
| **K-E Safe HTTP error mapping** | Converts typed Kernel failures to safe transport errors, controls status and sanitized messages | \`http.HttpContextException\`, \`HttpErrorResponse\`, \`HttpKernelErrorMapper\` (3) | Domain-specific localization/response extensions without product approval |
| **K-F Correlation and telemetry** | Propagates correlation context and safe telemetry attribute selection | \`observability.CorrelationPropagation\`, \`TelemetryAttributePolicy\`, \`TelemetryAttributes\` (3) | Tracing collector, metrics backend, exporter, retention and alerting |
| **K-G Health and readiness** | Synchronous liveness/readiness aggregation with safe probe results | \`health.HealthAggregator\`, \`HealthProbe\`, \`HealthSnapshot\`, \`ProbeResult\`, \`ProbeStatus\`, \`ProbeType\` (6) | Probe deadlines, deployed health endpoint, infrastructure orchestration |

**Runtime total = 2 + 1 + 3 + 6 + 3 + 3 + 6 = 24 Java source files**. Proposed dependencies: \`platform-kernel-contracts\` plus JDK 21. **No dependency on optional JDBC or testkit**. Products choose actual runtime wiring; this is not a remotely deployed Kernel authentication service.

### 12.3 Library C — platform-kernel-jdbc (existing optional PostgreSQL reliability adapter)

**Purpose:** implement the Kernel's narrow event/audit/idempotency persistence contracts using JDBC, without becoming the product's general-purpose ORM, data layer or a cross-domain database. Existing Maven artifact \`io.github.vyrnforge:platform-kernel-jdbc\` contains **14 Java source files** and three PostgreSQL migration resources.

| Component | Existing implementation | Exact Java surface | Ownership |
| --- | --- | --- | --- |
| **J-A Atomic transaction composition** | Product mutation + required audit/event intents + replay result in one JDBC transaction | \`JdbcReliabilityTransaction\` (1) | Product writes its own SQL, schema and transaction-domain work |
| **J-B Durable idempotency** | Tenant-scoped acquire/replay/lease and result encoding | \`JdbcIdempotencyPort\`, \`IdempotencyResultCodec\` (2) | Product reauthenticates/reauthorizes before begin and replay |
| **J-C Audit intent persistence** | Writes required audit intent using supplied datasource/transaction | \`JdbcAuditIntentPort\`, \`JdbcAuditIntentWriter\` (2) | Not a hosted compliance-evidence retention service |
| **J-D Event intent persistence** | Writes event envelope/intents for later delivery | \`JdbcEventIntentPort\`, \`JdbcEventIntentWriter\` (2) | Does not own broker or consumer receipt |
| **J-E Outbox delivery adapter** | Claim, lease fencing, bounded retry/dead-letter state, pluggable transport callback | \`JdbcOutboxPublisher\`, \`OutboxPublishResult\`, \`EventTransport\` (3) | Receiver idempotency, broker credentials and scheduling external |
| **J-F Serialization and SQL internals** | JSON codec, stable intent fingerprints, SQL failure helpers | \`JacksonRecordCodec\`, \`IntentFingerprint\`, \`SqlSupport\` (3) | No generic ORM or metadata query builder |
| **J-G Migration integration** | Optional Flyway convenience API, current Postgres schema V1–V3 | \`KernelJdbcMigrator\` (1); SQL resources \`V1__kernel_reliability.sql\`, \`V2__audit_append_only.sql\`, \`V3__outbox_claim_fencing.sql\` | Host owns Flyway execution/history, existing database and restore |

**JDBC total = 1 + 2 + 2 + 2 + 3 + 3 + 1 = 14 Java source files**. Existing implementation is **PostgreSQL-specific**, despite \`JDBC\` in the artifact name: the source uses \`JSONB\`, \`TIMESTAMPTZ\`, PL/pgSQL audit triggers, \`payload_json::text\`, and \`FOR UPDATE SKIP LOCKED\`. Current POM explicitly includes Flyway PostgreSQL integration, PostgreSQL JDBC driver and PostgreSQL Testcontainers. No MySQL production connector or MySQL migration currently exists.

#### J-H Connector/provider matrix: current versus future

| Database connector | Status | Required capability | Design disposition |
| --- | --- | --- | --- |
| **PostgreSQL** | **IMPLEMENTED ON CURRENT MAIN and released** | JDBC transactions, V1–V3 migration, JSONB, PostgreSQL row locks, outbox, idempotency | Remains the default supported backend for the current JDBC artifact |
| **MySQL (InnoDB)** | **FUTURE CANDIDATE — NOT IMPLEMENTED** | Separate dialect SQL, JSON read/write, UUID binding/storage, UTC timestamp semantics, migration scripts, claim locking/lease fencing, retry/rollback, dead-letter and Testcontainers tests | Requires a concrete Asset/ITSM consumer use case, compatibility design and explicit approval |
| **MariaDB** | **FUTURE CANDIDATE — NOT IMPLEMENTED** | Independent SQL-version/locking/JSON/trigger validation; do not assume identical behavior to MySQL | Separate decision if demanded |
| **SQL Server** | **FUTURE CANDIDATE — NOT IMPLEMENTED** | SQL Server data types, row-lock hints/claims, migration semantics, driver behavior and failover tests | Deferred |
| **Oracle / SQLite / others** | **NOT SUPPORTED / NOT IN CURRENT SCOPE** | No tested dialect, migration or operational guarantees | No roadmap commitment |

**Proposed internal connector architecture (NOT code committed):**
- \`jdbc.portable\`: narrow transaction/claim/replay algorithm **only after** proven reusable across two real dialect implementations; no premature universal SQL builder.
- \`jdbc.postgresql\`: current implementation ownership in a *future* decomposition. Initially keep the published \`persistence.jdbc\` FQCNs unchanged for ABI continuity.
- \`jdbc.mysql\`: optional MySQL-specific implementation **if approved**. Must not load PostgreSQL migration scripts, must select MySQL-specific Flyway locations/DDL, and must not silently share database schema or claims across products.
- Database configuration is **product-owned**: injected \`DataSource\`, credentials, pool, transaction isolation, host migration history, monitoring and backups. Kernel never configures a universal connection to other product databases.
- For the **first four-artifact extraction**, keep only the **existing PostgreSQL implementation**. Do not simultaneously add MySQL or move the PostgreSQL JDBC classes; those are separate workstreams.
- If a later MySQL connector requires another published JDBC-specific artifact to avoid pulling multiple drivers, that would **exceed the proposed four-artifact distribution** and needs another Architecture/Product decision. Otherwise optional provider packages inside the one JDBC JAR still need classpath, driver and Flyway isolation tests.
- **Dialect test contract:** migration-from-empty and upgrade; lease takeover/stale claim fencing; same-tenant and cross-tenant replay; rollback audit/event/domain atomicity; outbox crash after transport success; duplicate delivery; dead-letter recovery; UTC timestamp precision; locks/concurrency across separate processes; DB reconnect and permission errors. A JDBC interface alone cannot establish these guarantees.

#### PostgreSQL-to-MySQL compatibility hazards (must be validated before claiming support)

1. **Types:** \`JSONB\` and PostgreSQL \`UUID\`/TIMESTAMPTZ need explicit MySQL storage/driver mappings. Never auto-truncate IDs or fingerprints.
2. **SQL:** \`payload_json::text\` and PL/pgSQL audit append-only trigger cannot be reused unchanged.
3. **Concurrency:** \`FOR UPDATE SKIP LOCKED\` exists in relevant MySQL versions but its transaction/ordering/lease behavior must be tested, not presumed identical.
4. **Flyway:** V1–V3 are immutable PostgreSQL history. A MySQL installation needs its **own** migration path and version history; do not patch existing PostgreSQL migration bytes.
5. **Failure semantics:** SQLState/retry deadlocks, constraint failures, autocommit behavior, timezone precision and DB driver conversions need real integration tests.
6. **Authority:** these tables contain *Kernel reliability bookkeeping only*. Asset, ITSM and File Storage remain authoritative for their business records.

### 12.4 Library D — platform-kernel-testkit (existing, test-scoped)

**Purpose:** let consumer teams prove their implementation of Kernel ports without live IAM/database/broker prerequisites; do not use these fakes in production.

| Component | Exact implemented test helpers | Test purpose |
| --- | --- | --- |
| **T-A Fake identity** | \`StaticIdentityAdapter\` | Deterministic actor/credential projection and invalid-identity paths |
| **T-B Tenant membership** | \`InMemoryTenantMembershipPort\` | Same-tenant/cross-tenant membership and missing lookup |
| **T-C Domain permission** | \`PermissionAuthorizationHook\` | Product-owned action/resource denials |
| **T-D Module entitlements** | \`InMemoryModuleEntitlementPort\` | Module denial and effective entitlement fixtures |
| **T-E Feature/config** | \`InMemoryFeatureFlagPort\`, \`InMemoryConfigurationPort\` | Isolation and configuration states, not real permission grants |
| **T-F Event/audit intents** | \`InMemoryEventIntentPort\`, \`InMemoryAuditIntentPort\` | Evidence of accepted intents in deterministic tests; not durable compliance storage |
| **T-G Idempotency** | \`InMemoryIdempotencyPort\` | Lease/replay/conflict negative scenarios; not crash-durable storage |

**Testkit total = 1 + 1 + 1 + 1 + 2 + 2 + 1 = 9 Java source files**. Maven scope must remain \`test\` in product applications. Additional hypothetical MySQL integration fixtures/driver Testcontainers belong in JDBC connector test sources, not testkit production classes. Existing repository test suites and scripts remain CI/test infrastructure, not another published Kernel artifact.

### 12.5 Application dependency profiles

| Consumer use | Minimum proposed library | Optional addition | Example |
| --- | --- | --- | --- |
| Typed references, event/audit payloads, provider interfaces only | \`platform-kernel-contracts\` | \`platform-kernel-testkit\` for unit tests | Product SDK / cross-product event producer |
| Standard embedded request validation/HTTP/health | \`platform-kernel\` (transitively contracts) | Testkit | Asset or ITSM API |
| Durable replay, atomic audit/event/outbox on PostgreSQL | \`platform-kernel\` plus \`platform-kernel-jdbc\` | Testkit; product-owned database/transport | Product-specific PostgreSQL adoption |
| A product already providing its own equivalent reliable storage | Contracts/core as needed | **No JDBC** | File Storage may retain its own persistence ownership |
| MySQL-backed product | Contracts/core without Kernel JDBC until dialect is validated | **NO purported MySQL Kernel adapter today** | Future evaluation only |

Do not require the entire Kernel for a product that only needs portable DTOs *once* the contracts JAR is actually available. Today the only published portable surface remains through the existing \`platform-kernel\` core artifact.

### 12.6 What changes now vs later

**Now:** clarify the component ownership in PKG-02, keep the current three published JARs untouched, maintain the separate draft PKG-01 source import-check PR. Treat PostgreSQL as the only currently implemented JDBC connector. No generated MySQL classes, schemas, Maven artifacts, API/SQL migration or fourth service.

**After approval:** (1) record an explicit change to DEC-K022 for a fourth JAR; (2) prove consumer need, review migration/resource ABI plan; (3) implement one focused contracts extraction PR; (4) run composite ABI and actual File Storage/Asset/ITSM builds; (5) obtain separate independent security and release approval. A MySQL connector is an **independent proposal** requiring DB-specific tests, migrations and ownership approval. Do not combine it with the first contracts extraction simply to fill a package category.

**Boundary principle:** **a named Java component in this catalogue is not a hosted platform service and not a database connector by itself**. Provider authority, domain SQL, credentials, deployment, operational recovery and compliance signoff stay with the relevant product teams.
