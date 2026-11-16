# Application adoption checklist

Use the latest **verified, published** release, not a moving main branch or an unpublished version. For v0.3.2 upgrade guidance see [audit remediation](../v2/audit-remediation.md). Wire contract version remains v0.2. The kernel is an independent Java 21 library, not a service.

## Start here

Select a path in the [consumer blueprint](quickstart.md): A standalone primitives, B authenticated tenantless, C tenant-scoped, D optional JDBC (additive to the applicable scope). Document product, operation, authoritative data/policy owner, selected artifacts, applicable scope, durable mutation/intents, external references and required operational evidence. Do not impose a tenant or database on standalone primitives. Do not treat tenantless as deployment authority. IAM's DEPLOYMENT, TENANT and consumer TENANTLESS are distinct under [ADR-0085](https://github.com/wyrmgate/iam/blob/main/docs/adr/0085-platform-kernel-adoption-boundary.md).

## Dependencies
- Main library: io.github.vyrnforge:platform-kernel; no production third-party dependencies.
- Optional PostgreSQL/Flyway: io.github.vyrnforge:platform-kernel-jdbc, same version.
- Tests only: io.github.vyrnforge:platform-kernel-testkit, same version.
- Remove all old io.vyrnforge.platform and pre-consolidation split artifacts. Resolve from Maven Central without private credentials. Verify exact version and dependency tree; never mix coordinates or versions.

## Application acceptance

Apply the steps below according to the chosen operation, not merely the selected JAR. For each applicable step record the scenario ID and evidence using the [consumer conformance specification](consumer-conformance.md). A core-only application with local durable persistence must still meet applicable transaction, retry, delivery and recovery requirements. A standalone primitive consumer does not need a request pipeline or database solely for the library.
1. Establish verified identity at the trusted authentication boundary; do not construct ValidatedIdentityCredential from unverified claims. Issuer + subject identifies external provenance; map distinct issuers with identical subjects to distinct stable actor IDs.
2. For tenant-owned operations resolve authoritative membership, active tenant, module entitlement and resource ownership; deny cross-tenant and tenantless access. Domain authorization is mandatory even with entitlement. Entitlement providers resolve scheduling/revocation; future effective decisions fail closed. Reauthorize on every retry, background action or replay.
3. Use UUIDv7 for new kernel-owned technical IDs and opaque external file/identity IDs. Serialize canonical snake_case wire fields, lowercase enum values, UTC instants, nullable required fields and JSON-object event payloads; validate against bundled v0.2 schemas at the transport boundary. Do not assume default record serialization matches wire JSON.
4. Use correlation IDs end to end, new request ID per invocation, safe errors and redacted logs. Do not expose credentials, provider keys or signed URLs in audit/event payloads. FileReference is a reference, never an authorization grant.
5. For JDBC use the owning product database with distinct least-privilege runtime/migration roles. Keep all business mutation and required audit/event intents plus idempotency result in executeIdempotent on the supplied connection. No external network calls in the transaction. Preserve immutable migrations; drain old writers/publishers before upgrade. Reauthorize before replay and include effective caller/target semantics in request fingerprint. Do not replay expired credentials or signed URLs. For local persistence demonstrate equivalent product-owned atomicity, without a second authoritative store. Stop/drain old publishers before V3 and old intent writers before 0.3.2 writes; no mixed old/new publishers or unsafe old-writer rollback against new fingerprints. See [audit remediation](../v2/audit-remediation.md) and [production hardening](../v2/production-hardening.md).
6. Assume at-least-once event transport. Deduplicate eventId at receiver; reconcile DEAD records before resending. Configure bounded retries, retention and monitoring; verify crash, concurrent retry, lost response, rollback, stale worker and restore behavior.
7. Run domain-specific negative tests and load/restore exercises using agreed SLO/RPO/RTO. Record exact artifact version, CI evidence, deployment configuration and residual risks. A successful library build is not proof of deployed service security.

## Evidence handoff and exit

| Checkpoint | Required record |
| --- | --- |
| Artifact and scope | Coordinates/version/digest of each selected artifact, dependency tree, Java version, exact application commit and tested checkout, chosen adoption path and authoritative owner |
| Trust and data | Verified identity source, issuer/subject mapping, effective tenant/entitlement/authorization, actual query/write isolation; negative cases and safe output |
| Contracts and reliability | Released wire version, serialization evidence, applicable local/JDBC transaction, replay, duplicate delivery and migration/rollback scenarios |
| Operational acceptance | Real environment configuration (no secrets), safe telemetry, health, agreed SLO/RPO/RTO and load/restore results as applicable |
| Review | Scenario ID, expected/observed result, evidence link, PASS/FAIL/STALE/MISSING/N/A, applicability rationale, reviewer and owner, reopen condition |

Use the conformance matrix for exact scenario definitions. All applicable mandatory cases must pass at the accepted revision; a missing or stale check is not a pass. A successful library or synthetic test is not product acceptance. Product owners retain their own security, operational and adoption decisions. Record unknown business-effort baselines for FAA-05; no numerical outcome is assumed.

## Real consumer gate
Kernel CI checks out File Storage FS-110A at 43f1c5552a3202ad0724e516fe51c03886373591 and runs its original domain/SPI/application/security tests against the exact candidate JAR in an isolated Maven cache. This proves compilation, application behavior and synthetic trusted-identity/authorization boundary tests at that historical pinned consumer revision, not current Storage main, live IAM, storage provider, persistence or production deployment. The candidate core JAR gate does not prove the published JDBC artifact or current consumer dependency graph. File Storage FS-110/FS-120 must validate those boundaries in their authorized increments. Asset/ITSM remain separate product validation targets. See [issue #34](https://github.com/vyrnforge/platform-kernel/issues/34), the [FAA-01 evidence register](../strategy/foundation-adoption-assurance.md), and [issue #41](https://github.com/vyrnforge/platform-kernel/issues/41) for the existing cross-consumer acceptance work. IAM E1b/K2, G3 restrictions and all independent consumer gates remain unchanged.
