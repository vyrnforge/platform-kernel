# Application adoption checklist

Use the latest **verified, published** release, not a moving main branch or an unpublished version. For v0.3.2 upgrade guidance see [audit remediation](../v2/audit-remediation.md). Wire contract version remains v0.2. The kernel is an independent Java 21 library, not a service.

## Dependencies
- Main library: io.github.vyrnforge:platform-kernel; no production third-party dependencies.
- Optional PostgreSQL/Flyway: io.github.vyrnforge:platform-kernel-jdbc, same version.
- Tests only: io.github.vyrnforge:platform-kernel-testkit, same version.
- Remove all old io.vyrnforge.platform and pre-consolidation split artifacts. Resolve from Maven Central without private credentials. Verify exact version and dependency tree; never mix coordinates or versions.

## Application acceptance
1. Establish verified identity at the trusted authentication boundary; do not construct ValidatedIdentityCredential from unverified claims. Issuer + subject identifies external provenance; map distinct issuers with identical subjects to distinct stable actor IDs.
2. For tenant-owned operations resolve authoritative membership, active tenant, module entitlement and resource ownership; deny cross-tenant and tenantless access. Domain authorization is mandatory even with entitlement. Entitlement providers resolve scheduling/revocation; future effective decisions fail closed. Reauthorize on every retry, background action or replay.
3. Use UUIDv7 for new kernel-owned technical IDs and opaque external file/identity IDs. Serialize canonical snake_case wire fields, lowercase enum values, UTC instants, nullable required fields and JSON-object event payloads; validate against bundled v0.2 schemas at the transport boundary. Do not assume default record serialization matches wire JSON.
4. Use correlation IDs end to end, new request ID per invocation, safe errors and redacted logs. Do not expose credentials, provider keys or signed URLs in audit/event payloads. FileReference is a reference, never an authorization grant.
5. For JDBC use the owning product database with distinct least-privilege runtime/migration roles. Keep all business mutation and required audit/event intents plus idempotency result in executeIdempotent on the supplied connection. No external network calls in the transaction. Preserve immutable migrations; drain old writers/publishers before upgrade. Reauthorize before replay and include effective caller/target semantics in request fingerprint. Do not replay expired signed URLs.
6. Assume at-least-once event transport. Deduplicate eventId at receiver; reconcile DEAD records before resending. Configure bounded retries, retention and monitoring; verify crash, concurrent retry, lost response, rollback, stale worker and restore behavior.
7. Run domain-specific negative tests and load/restore exercises using agreed SLO/RPO/RTO. Record exact artifact version, CI evidence, deployment configuration and residual risks. A successful library build is not proof of deployed service security.

## Real consumer gate
Kernel CI checks out File Storage FS-110A at 43f1c5552a3202ad0724e516fe51c03886373591 and runs its original domain/SPI/application/security tests against the exact candidate JAR in an isolated Maven cache. This proves current consumer compilation, application behavior and synthetic trusted-identity/authorization boundary tests, not live IAM, storage provider, persistence or production deployment. File Storage FS-110/FS-120 must validate those boundaries in their authorized increments. Asset/ITSM remain separate product validation targets. See issue #34.
