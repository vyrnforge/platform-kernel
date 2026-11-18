import {version} from './data.mjs';

// Published-release examples only. Candidate APIs belong in the separate preview.
export const documentationVersion = version;
export const developerGuides = [
  {
    "id": "install",
    "group": "Getting started",
    "title": "Install the released library",
    "summary": "Add the smallest dependency, with no server or database required.",
    "prerequisite": "A JDK 21 or newer (not only a JRE), plus an existing Maven or Gradle Java project. Maven Central needs no custom repository credentials.",
    "when": "Every new consumer starts here. Add JDBC or testkit only for a demonstrated requirement.",
    "steps": [
      "Confirm your JDK with `java -version` and `javac -version`; both must be 21+. Maven and Gradle might use a different JDK than your terminal.",
      "For Maven, paste the dependency fragment inside an existing pom.xml <dependencies> element. For Gradle Kotlin DSL, put the repositories/dependencies blocks in the build.gradle.kts of an existing Java project.",
      "Use io.github.vyrnforge for Maven/Gradle coordinates, but import Java packages from io.vyrnforge.platform.kernel.",
      "Start with platform-kernel. Add optional platform-kernel-jdbc only for product-owned PostgreSQL reliability and platform-kernel-testkit only for tests."
    ],
    "samples": [
      {
        "label": "Maven",
        "kind": "Maven dependency fragment (inside <dependencies>)",
        "language": "xml",
        "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel</artifactId>\n  <version>0.3.2</version>\n</dependency>",
        "filename": "pom.xml"
      },
      {
        "label": "Gradle",
        "kind": "Gradle Kotlin DSL fragment (inside build.gradle.kts)",
        "language": "kotlin",
        "code": "repositories { mavenCentral() }\n\ndependencies {\n  implementation(\"io.github.vyrnforge:platform-kernel:0.3.2\")\n}",
        "filename": "build.gradle.kts"
      }
    ],
    "verify": "Check `mvn dependency:tree` or `./gradlew dependencies` in the consuming project and confirm io.github.vyrnforge:platform-kernel:0.3.2. Then run the standalone first Java program to verify real APIs. No hosted Kernel service is needed.",
    "ownership": "Your application controls its build and runtime. Kernel is an embedded Java library, not a hosted service.",
    "guide": "docs/integration/three-jar-distribution.md",
    "source": "pom.xml",
    "provides": "A dependency-light Java 21 core library with request context, IDs, cross-cutting contracts and basic utilities. No hosted Kernel server.",
    "mistakes": [
      "An XML <dependency> fragment is not a complete pom.xml; put it inside <dependencies>. Gradle Kotlin DSL snippets belong in build.gradle.kts, with the Java plugin and JDK configured by your application.",
      "If Maven Central resolution fails, check internet/DNS/proxy access and the exact io.github.vyrnforge:platform-kernel:0.3.2 coordinate. No private credentials or unpublished versions are needed.",
      "Do not mix old split artifact IDs, obsolete Maven groups or Java packages; check both javac -version and your build-tool JDK."
    ]
  },
  {
    "id": "first",
    "group": "Getting started",
    "title": "Your first Java program",
    "summary": "Generate UUIDv7 identifiers and correlation context without an identity provider.",
    "prerequisite": "JDK 21+ with java and javac available, plus curl (macOS/Linux) or PowerShell (Windows), with access to Maven Central. No Maven or Gradle project is necessary for this standalone class.",
    "when": "A service, CLI or worker needs consistent identifiers or correlation before deeper integration.",
    "steps": [
      "Create an empty folder, then save the complete Java 21 sample as FirstKernelProgram.java (matching its public class name).",
      "Select Run (macOS/Linux) or Windows (PowerShell). The commands download the published 0.3.2 JAR from Maven Central, compile against Java 21 and execute the class.",
      "Verify that exactly two lowercase UUIDv7 values appear on separate lines. Their third UUID block begins with 7; each run generates new values.",
      "Use the Kernel's correlation ID in your own HTTP/event/job context. Kernel does not install middleware, identity verification or a server."
    ],
    "samples": [
      {
        "label": "Java 21",
        "kind": "Complete Java example",
        "language": "java",
        "code": "import io.vyrnforge.platform.kernel.ids.UuidV7;\nimport io.vyrnforge.platform.kernel.context.CorrelationContext;\n\npublic final class FirstKernelProgram {\n  public static void main(String[] args) {\n    var id = UuidV7.generate();\n    var correlation = CorrelationContext.create();\n    System.out.println(id);\n    System.out.println(correlation.correlationId());\n  }\n}",
        "filename": "FirstKernelProgram.java"
      },
      {
        "label": "Run",
        "kind": "Standalone macOS/Linux commands — complete",
        "language": "bash",
        "filename": "Terminal (macOS/Linux)",
        "code": "curl --fail --location --silent --show-error \\\n  --output platform-kernel-0.3.2.jar \\\n  https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.2/platform-kernel-0.3.2.jar\njavac --release 21 -cp platform-kernel-0.3.2.jar FirstKernelProgram.java\njava -cp \".:platform-kernel-0.3.2.jar\" FirstKernelProgram"
      },
      {
        "label": "Windows",
        "kind": "Standalone Windows PowerShell commands — complete",
        "language": "powershell",
        "filename": "Windows PowerShell",
        "code": "Invoke-WebRequest -Uri 'https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.2/platform-kernel-0.3.2.jar' -OutFile 'platform-kernel-0.3.2.jar'\njavac --release 21 -cp .\\platform-kernel-0.3.2.jar .\\FirstKernelProgram.java\njava -cp '.;.\\platform-kernel-0.3.2.jar' FirstKernelProgram"
      }
    ],
    "verify": "The output contains two UUIDv7 identifiers (format xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx). On Windows PowerShell the classpath separator is `;`, not `:`. A successful first run uses only the published core JAR, with no other services.",
    "ownership": "Your application chooses when to create and propagate correlation context. Kernel does not implement your HTTP server or logger.",
    "guide": "docs/integration/quickstart.md",
    "source": "verification/GeneralUsageExample.java",
    "provides": "UuidV7.generate() and CorrelationContext.create() are public methods in the v0.3.2 source; no request pipeline is required for this standalone example.",
    "mistakes": [
      "Save the Java tab as FirstKernelProgram.java; if you get ClassNotFoundException, run from the folder containing that file and the JAR and check the classpath separator.",
      "If javac is missing or --release 21 is unsupported, install/select a JDK 21+ rather than only a Java runtime.",
      "Use the Windows tab in PowerShell (Invoke-WebRequest and `;`) or the Unix Run tab in macOS/Linux (curl and `:`). If the download fails, diagnose access to Maven Central; do not substitute the unpublished 0.4.0 candidate."
    ],
    "expectedOutput": "Exactly two lowercase canonical UUIDv7 strings on separate lines. The first is a generated identifier; the second is correlation.correlationId(). Both change on each run."
  },
  {
    "id": "request",
    "group": "Integrate",
    "title": "Resolve a trusted request",
    "summary": "Choose tenantless or tenant-scoped requests, validate identity at the application boundary, and diagnose the first denied gate.",
    "prerequisite": "Java 21+ and the published platform-kernel:0.3.2 core JAR; a real IAM/IdP verifier and an application-owned authorization policy. Scoped endpoints additionally require authoritative tenant membership and current module entitlements.",
    "when": "An authenticated endpoint needs a normalized actor, tenant guard and explicit resource authorization.",
    "steps": [
      "Verify the user's or service's credential in application/IAM/IdP middleware (issuer, signature, audience, expiry and relevant session controls). Only THEN create a trusted, normalized ValidatedIdentityCredential; never build it from unverified client claims or assume the bearer extractor authenticates.",
      "Compose the published four-port RequestContextPipeline constructor using ValidatedIdentityAdapter plus application-owned TenantMembershipPort, ModuleEntitlementPort and DomainAuthorizationHook. The domain hook is mandatory for both tenantless and tenant-scoped requests.",
      "Choose an explicitly tenantless endpoint only for authenticated global/non-tenant-owned resources: TenantContext.none() and EndpointPolicy.tenantless(action). Kernel skips membership and module checks only on a valid tenantless request; it still runs domain authorization.",
      "For tenant-owned operations, set exactly one active TenantContext.tenant(tenantId), use EndpointPolicy.tenantModule(moduleKey, action), and pass an authoritative ResourceReference. The product still enforces tenant-filtered SQL and its resource policy.",
      "At the HTTP edge preserve duplicate header values, extract only trusted request metadata, and use HttpRequestContextAdapter to resolve context. HttpKernelErrorMapper maps Kernel failures; the application owns web dispatch, upstream verification failures and safe domain error responses. Record request/correlation IDs without tokens or sensitive attributes."
    ],
    "samples": [
      {
        "label": "Tenantless",
        "kind": "Integration excerpt — pipeline and verifiedIdentity are application-supplied",
        "language": "java",
        "code": "var profile = pipeline.resolve(new RequestContextInput<>(\n    verifiedIdentity,\n    TenantContext.none(),\n    CorrelationContext.create(),\n    EndpointPolicy.tenantless(\"profile.read\"),\n    null));\n// Authenticated + domain-authorized; no tenant-owned resource.",
        "filename": "Handler.java (excerpt)"
      },
      {
        "label": "Tenant-scoped",
        "kind": "Integration excerpt — pipeline, verifiedIdentity, tenantId and recordId are application-supplied",
        "language": "java",
        "code": "var record = new ResourceReference(\"record\", recordId, tenantId);\nvar context = pipeline.resolve(new RequestContextInput<>(\n    verifiedIdentity,\n    TenantContext.tenant(tenantId),\n    CorrelationContext.create(),\n    EndpointPolicy.tenantModule(\"records\", \"records.read\"),\n    record));\n// The application's query must also enforce tenant ownership.",
        "filename": "Handler.java (excerpt)"
      },
      {
        "label": "Wiring",
        "kind": "Integration excerpt — application supplies three ports and trusted verifier",
        "language": "java",
        "filename": "RequestWiring.java (excerpt)",
        "code": "import io.vyrnforge.platform.kernel.identity.ValidatedIdentityAdapter;\nimport io.vyrnforge.platform.kernel.identity.ValidatedIdentityCredential;\nimport io.vyrnforge.platform.kernel.pipeline.RequestContextPipeline;\nimport io.vyrnforge.platform.kernel.ports.TenantMembershipPort;\nimport io.vyrnforge.platform.kernel.ports.ModuleEntitlementPort;\nimport io.vyrnforge.platform.kernel.ports.DomainAuthorizationHook;\n\n// These three ports must come from your application's authoritative services.\nRequestContextPipeline<ValidatedIdentityCredential> pipeline =\n    new RequestContextPipeline<>(\n        new ValidatedIdentityAdapter(),\n        tenantMembershipPort,    // TenantMembershipPort\n        moduleEntitlementPort,   // ModuleEntitlementPort\n        domainAuthorizationHook  // DomainAuthorizationHook\n    );"
      }
    ],
    "verify": "Run both positive paths and all negative cases in the table below. Compare KernelFailure codes, mapped HTTP statuses and first stopped gate; confirm subsequent checks are not reached. Verify actual product SQL/data isolation and safe request/correlation metadata with your real verifier and adapters.",
    "ownership": "Native IAM or an external IdP verifies identity; Kernel embeds normalized context, scope/membership/entitlement guards and safe HTTP mapping; the application owns membership/entitlement truth, business-resource policy, tenant-scoped SQL, transport and diagnostics. A module or feature flag is never a record permission.",
    "guide": "docs/integration/identity-boundary.md",
    "source": "verification/GeneralUsageExample.java",
    "provides": "Published v0.3.2 RequestContextPipeline (four-port constructor), ValidatedIdentityAdapter, RequestContextInput, endpoint policy and HTTP edge helpers. The library does not independently verify bearer tokens, create user tenants or authorize a product's business records.",
    "mistakes": [
      "Do not pass raw Authorization headers or unverified JWT claims into ValidatedIdentityCredential; a bearer extractor only extracts and a validated identity adapter trusts a previously verified projection.",
      "Do not substitute module entitlement or feature flags for application-owned DomainAuthorizationHook or tenant-filtered SQL. Tenant membership and module eligibility do not grant record access.",
      "Do not use TenantContext.none() for tenant-owned resources, silently create personal tenants, or trust a client-provided resource tenant ID. A mismatched resource is hidden by the HTTP mapper as 404.",
      "Trace denied requests using safe stable error codes with request_id and correlation_id. Never log raw tokens, identity-provider claims, credential headers or sensitive record payloads."
    ],
    "endpointChoices": [
      {
        "id": "tenantless",
        "name": "Authenticated tenantless",
        "when": "Non-tenant-owned profile or global operation",
        "policy": "TenantContext.none() + EndpointPolicy.tenantless(action)",
        "guards": "Trusted identity → scope (no active tenant/tenant-owned resource) → application domain authorization",
        "ownership": "Application verifies actor and resource policy; no membership or module-entitlement lookup.",
        "scenario": "success"
      },
      {
        "id": "scoped",
        "name": "Tenant-scoped",
        "when": "Product data belonging to an explicitly selected tenant",
        "policy": "TenantContext.tenant(tenantId) + EndpointPolicy.tenantModule(moduleKey, action)",
        "guards": "Trusted identity → active/resource tenant → membership → module entitlement → application domain authorization",
        "ownership": "Application supplies membership/entitlement data and authoritative resource tenant, plus tenant-filtered product SQL.",
        "scenario": "success"
      }
    ],
    "failureCases": [
      {
        "id": "unverified",
        "scope": "scoped",
        "trigger": "Unverified or absent trusted actor",
        "gate": "Credential verification / identity",
        "failure": "AUTHENTICATION_FAILED",
        "http": "401",
        "owner": "Application / IAM / IdP",
        "recovery": "Reject before constructing a trusted projection. If failure reaches Kernel, the HTTP adapter maps AUTHENTICATION_FAILED to 401."
      },
      {
        "id": "scope-tenantless",
        "scope": "tenantless",
        "scenario": "scope",
        "trigger": "Active tenant on tenantless policy",
        "gate": "Request scope",
        "failure": "INVALID_CONTEXT",
        "http": "400",
        "owner": "Kernel guard; application fixes endpoint use",
        "recovery": "Use a tenantless endpoint only for global resources with no active tenant. Never strip tenant scope to access tenant-owned data."
      },
      {
        "id": "scope-scoped",
        "scope": "scoped",
        "scenario": "scope",
        "trigger": "No active tenant on tenant-scoped policy",
        "gate": "Request scope",
        "failure": "TENANT_REQUIRED",
        "http": "403",
        "owner": "Kernel guard; application selects tenant",
        "recovery": "Require exactly one active trusted tenant; do not infer a personal tenant."
      },
      {
        "id": "cross-tenant",
        "scope": "scoped",
        "trigger": "Resource belongs to another tenant",
        "gate": "Resource tenant guard",
        "failure": "TENANT_CONTEXT_MISMATCH",
        "http": "404",
        "owner": "Kernel guard + product resource lookup",
        "recovery": "Resolve resource tenant from authoritative product storage; hide cross-tenant existence in responses."
      },
      {
        "id": "membership",
        "scope": "scoped",
        "trigger": "Actor has no tenant membership",
        "gate": "Membership port",
        "failure": "TENANT_MEMBERSHIP_REQUIRED",
        "http": "403",
        "owner": "Application membership authority",
        "recovery": "Inspect active tenant and authoritative membership. Do not bypass the guard or substitute an untrusted claim."
      },
      {
        "id": "module",
        "scope": "scoped",
        "trigger": "Required module is not effectively enabled",
        "gate": "Module entitlement",
        "failure": "MODULE_DISABLED",
        "http": "403",
        "owner": "Application entitlement authority",
        "recovery": "Check current module key, tenant, enabled state and effectiveAt. Module availability is not record permission."
      },
      {
        "id": "denied",
        "scope": "scoped",
        "trigger": "Actor lacks permission on this resource",
        "gate": "Domain authorization",
        "failure": "DOMAIN_ACCESS_DENIED",
        "http": "403",
        "owner": "Owning application",
        "recovery": "Evaluate product-specific action/resource policy and product-owned tenant-filtered SQL."
      },
      {
        "id": "tenantless-denied",
        "scope": "tenantless",
        "scenario": "denied",
        "trigger": "Global operation denied by domain policy",
        "gate": "Domain authorization",
        "failure": "DOMAIN_ACCESS_DENIED",
        "http": "403",
        "owner": "Owning application",
        "recovery": "Tenantless remains authenticated and domain-authorized. No entitlement lookup or automatic allow."
      }
    ],
    "diagnostics": "Use stable safe PLATFORM_* error codes, request_id and correlation_id from the HTTP response/observability boundary to locate the failed check. Keep all tokens, credential headers, personal claims and resource payloads out of logs or error details; map independent application/domain errors separately."
  },
  {
    "id": "jdbc",
    "group": "Integrate",
    "title": "Make a retriable write durable",
    "summary": "Choose optional JDBC for durable retriable writes; understand each acquire result, atomic boundaries, delivery and recovery.",
    "prerequisite": "Java 21+, published platform-kernel-jdbc:0.3.2 only when a tenant-scoped durable mutation needs it, product-owned PostgreSQL DataSource and applicable packaged V1–V3 Flyway migrations. Application authorization is required on every attempt, including REPLAY.",
    "when": "A tenant-scoped write may be retried after timeout/lost response and must atomically commit product data, required audit/event intents and a replayable safe result. Skip JDBC for plain identifiers, correlation or read-only integration.",
    "steps": [
      "Decide whether the operation actually needs durable idempotency: use core alone for ordinary utility/request-context work; add optional platform-kernel-jdbc only for product-owned PostgreSQL retriable mutations.",
      "Apply the packaged V1–V3 schema through the product's own controlled Flyway history/migration process. Do not run parallel writers or mixed publisher versions while planning V3/upgrade/rollback.",
      "Verify credential, tenant, membership, module and resource authorization on EVERY attempt before begin(request). Include effective actor, target and payload semantics in the fingerprint, bound to tenant, operation, key and expiry.",
      "Call JdbcIdempotencyPort.begin(request) and handle the returned ACQUIRED, REPLAY, IN_PROGRESS or CONFLICT decision. ONLY ACQUIRED may execute product SQL; REPLAY may return only a currently authorized safe result.",
      "Use JdbcReliabilityTransaction.executeIdempotent for ACQUIRED: domain SQL on its supplied Connection, required event/audit intents through supplied ports, and replay result in one commit. Never open a second connection, manually commit/rollback, or call external services inside the callback.",
      "Operate outbox dispatch separately with bounded retries and at-least-once receivers. Product consumers deduplicate by event ID; operators reconcile stale/lost claims, exhausted DEAD events, uncertain commits, backups and migrations."
    ],
    "samples": [
      {
        "label": "Maven adapter",
        "kind": "Optional dependency configuration",
        "language": "xml",
        "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel-jdbc</artifactId>\n  <version>0.3.2</version>\n</dependency>",
        "filename": "pom.xml"
      },
      {
        "label": "Java recipe",
        "kind": "Integration excerpt — all ports, request and safeResult are application-supplied",
        "language": "java",
        "code": "var decision = idempotencyPort.begin(request);\nswitch (decision.type()) {\n  case ACQUIRED -> transactions.executeIdempotent(\n      decision.lease(), IdempotencyResultCodec.strings(),\n      (connection, events, audits) -> {\n        // Write product-owned SQL on connection.\n        // Record required event/audit intents via the supplied ports.\n        return safeResult;\n      });\n  case REPLAY -> { var result = decision.replay().result(); }\n  case IN_PROGRESS, CONFLICT -> { /* safe API response */ }\n}",
        "filename": "MutationHandler.java (excerpt)"
      }
    ],
    "verify": "Use published consumer conformance CC-14–CC-22 and CC-27 with actual product SQL, an application-owned PostgreSQL database and audit/outbox behavior. Test first commit, replay, concurrent retry, conflicting fingerprint, expiry/revocation, rollback, crash/lost response, deduplication, stale/DEAD claims, restore and migration compatibility. Simulated Playground results do not certify the consumer.",
    "ownership": "Your product owns current authorization, data and SQL, single JDBC Connection, DataSource, Flyway history, reliable event publisher transport, deduplication, audit evidence and operational recovery. Kernel provides optional lease/transaction/intent/outbox mechanics; not a broker or managed database.",
    "guide": "docs/integration/jdbc-safe-mutation.md",
    "source": "kernel-persistence-jdbc/",
    "provides": "Published v0.3.2 optional PostgreSQL/JDBC lease-backed idempotency, executeIdempotent atomic application SQL plus audit/event intents and result, claim-fenced outbox rows. No automatic worker, migration runner, exactly-once transport or product policy.",
    "mistakes": [
      "Never use a second Connection, connection.commit()/rollback(), external network request or independent execute + complete pair inside the durable retriable mutation. Only executeIdempotent on the supplied connection provides the documented atomic path.",
      "Do not replay an old result without re-checking current caller authorization; never persist/replay signed URLs, secrets or expired access material. Retention expiry allows re-execution under the product's policy.",
      "IN_PROGRESS does not mean REPLAY: another lease is active. Return safe retry guidance rather than starting a second write. CONFLICT is different effective request semantics; HTTP 409 is only an illustrative application mapping.",
      "Rollback/connection loss can leave an IN_PROGRESS lease until abort/expiry. Do not blindly abort after an uncertain commit; reconcile against authoritative product data first.",
      "Outbox is at-least-once, not exactly-once; stale worker claim completions are fenced, but a DEAD event might already have been sent. Reconcile receiver evidence before re-drive.",
      "Application-owned Flyway migration history controls V1–V3. Drain old publishers and audit/intent writers before incompatible upgrades and plan restore/rollback; never assume the library runs migrations."
    ],
    "decisionStates": [
      {
        "id": "success",
        "type": "ACQUIRED",
        "effect": "One product-owned JDBC transaction may execute domain SQL, required audit/event intents and serialized safe result.",
        "owner": "Product handler + optional JDBC transaction",
        "next": "Return only after commit; dispatch outbox later.",
        "recovery": "Do not call other services or commit in the callback."
      },
      {
        "id": "replay",
        "type": "REPLAY",
        "effect": "No new domain SQL or event/audit intent. Return stored result only after fresh authorization.",
        "owner": "Product request handler",
        "next": "Existing outbox delivery or reconciliation may still be pending.",
        "recovery": "Recheck caller and target permissions and avoid time-limited secrets or signed URLs."
      },
      {
        "id": "in-progress",
        "type": "IN_PROGRESS",
        "effect": "No new domain SQL or intent; an active matching lease is still processing.",
        "owner": "Product API/retry policy",
        "next": "Give bounded safe retry guidance; do not start another mutation.",
        "recovery": "If lease is stale, reconcile operation and expiry before recovery."
      },
      {
        "id": "conflict",
        "type": "CONFLICT",
        "effect": "No new domain SQL or intent; same key has a different effective fingerprint.",
        "owner": "Product API/validation",
        "next": "Reject key reuse; illustrative HTTP 409 is application-owned.",
        "recovery": "Check effective actor/target/payload, do not mutate under the conflicting key."
      }
    ],
    "recoveryPaths": [
      {
        "case": "Rollback or thrown callback",
        "explanation": "The product mutation and required intents roll back together. An acquired lease may remain IN_PROGRESS until abort or expiry.",
        "verify": "CC-17 / CC-18",
        "owner": "Product SQL and retry operator"
      },
      {
        "case": "Lost response or uncertain commit",
        "explanation": "Reauthorize the caller, inspect committed state and lease/result; distinguish safe REPLAY from still IN_PROGRESS before aborting or retrying.",
        "verify": "CC-14 / CC-16 / CC-18",
        "owner": "Product API and incident operator"
      },
      {
        "case": "Duplicate event or lost outbox claim",
        "explanation": "Receivers deduplicate event IDs. A stale publisher cannot finish an expired claim, but delivery might already have happened.",
        "verify": "CC-19 / CC-20",
        "owner": "Transport receiver / outbox operator"
      },
      {
        "case": "Exhausted DEAD event",
        "explanation": "Investigate transport and receiver evidence before re-drive: DEAD does not prove the remote target never received the event.",
        "verify": "CC-20 / CC-22",
        "owner": "Product operations"
      },
      {
        "case": "Missing required audit/event intent",
        "explanation": "Required intent and business data must commit together or neither. Audit integrity and permissions are validated against the actual product DB.",
        "verify": "CC-17 / CC-21",
        "owner": "Product data / security"
      },
      {
        "case": "Migration or backup restoration",
        "explanation": "Use product-owned Flyway history, writer drain, backup/restore and recovery-point reconciliation; no automatic Kernel migration execution.",
        "verify": "CC-22 / CC-27",
        "owner": "Product DB owner"
      }
    ]
  },
  {
    "id": "assure",
    "group": "Test & operate",
    "title": "Verify your consumer",
    "summary": "Use test-only helpers, then validate the real identity, database and recovery paths.",
    "prerequisite": "A pinned application source revision and an explicit list of operations that consume the Kernel.",
    "when": "Before adopting a Kernel version or declaring an integration production-ready.",
    "steps": [
      "Keep platform-kernel-testkit:0.3.2 strictly in Maven test scope. Its in-memory helpers are fixtures, not production identity verification, business-policy authority or PostgreSQL evidence.",
      "Run your application unit and integration tests for verified identity, tenantless/scoped requests, membership, module entitlement and domain authorization against real product wiring.",
      "Where the operation is durable, use application-owned PostgreSQL and SQL for conformance CC-14–CC-22 (first write, replay, in-flight retries, conflict, rollback, lost response, claim fencing, audit/event integrity, restore). Apply CC-27 for JDBC V3 migrations/upgrade.",
      "Record selected published artifact digests and exact application revision, scenario results and failed cases, authorization replay, outbox dedup and failure recovery, operational owner and independent rollback approval. Do not treat a simulated trace or Kernel CI as product acceptance."
    ],
    "samples": [
      {
        "label": "Maven testkit",
        "kind": "Test-only dependency configuration",
        "language": "xml",
        "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel-testkit</artifactId>\n  <version>0.3.2</version>\n  <scope>test</scope>\n</dependency>",
        "filename": "pom.xml"
      }
    ],
    "verify": "For durable operations, record actual product-specific evidence for CC-14 through CC-22 and CC-27, including real tenant isolation, rollback/uncertain commit, safe replay, duplicate delivery, DEAD, restore and migration/rollback. Nonapplicable scenarios need rationale; do not claim conformance from the simulated Playground or testkit alone.",
    "ownership": "The consuming application owns its authorization, database, SLOs, rollback plan, upgrade choice and independent acceptance.",
    "guide": "docs/integration/consumer-conformance.md",
    "source": "kernel-testkit/",
    "provides": "Deterministic in-memory membership, entitlement, audit/event and idempotency test adapters for consumer tests; not an operational certification tool.",
    "mistakes": [
      "A green Kernel repository pipeline or Playground simulation does not prove your application integration is secure.",
      "Test the same tenant/resource authorization paths in production wiring, not only with permissive test fixtures.",
      "Keep event delivery, backups, transaction recovery, observability and rollback in the application runbook."
    ],
    "conformanceCases": [
      {
        "id": "CC-14",
        "title": "Acquire, in-flight retry, replay",
        "evidence": "One committed effect; distinct ACQUIRED / IN_PROGRESS / REPLAY within retention."
      },
      {
        "id": "CC-15",
        "title": "Conflicting fingerprint and expiry",
        "evidence": "CONFLICT for mismatched request; expiry/reacquisition documented."
      },
      {
        "id": "CC-16",
        "title": "Authorization on replay",
        "evidence": "Revoked/changed permissions fail; no expired signed URLs or secrets replayed."
      },
      {
        "id": "CC-17",
        "title": "Atomic domain + required intents",
        "evidence": "Product SQL, events/audit and safe result commit together or roll back together."
      },
      {
        "id": "CC-18",
        "title": "Concurrent/lost response recovery",
        "evidence": "Real PostgreSQL lease/crash/fault tests; no duplicate domain effect."
      },
      {
        "id": "CC-19",
        "title": "At-least-once receiver",
        "evidence": "Duplicate delivery safely deduplicated by consumer."
      },
      {
        "id": "CC-20",
        "title": "Fenced outbox / DEAD",
        "evidence": "Stale claim cannot mutate; exhausted DEAD reconciled, delivery uncertainty acknowledged."
      },
      {
        "id": "CC-21",
        "title": "Audit integrity",
        "evidence": "Actual product role and audit append-only protection."
      },
      {
        "id": "CC-22",
        "title": "Restore consistency",
        "evidence": "Restore and reconciliation for committed data, intents and delivery."
      },
      {
        "id": "CC-27",
        "title": "Migration and rollback",
        "evidence": "Product Flyway V1–V3 ownership, drain and safe rollback plan."
      }
    ]
  }
];

// Search existing guide content with one best matching destination per guide.
// Returned snippets and section IDs are derived from the same canonical site guide data.
export function searchDeveloperGuideMatches(query){
  const needle=String(query).trim().toLocaleLowerCase();
  if(!needle)return developerGuides.map(guide=>({guide,section:'overview',label:'Guide',excerpt:'',sampleIndex:null}));
  const excerpt=(text)=>{
    const value=String(text).replace(/\s+/g,' ').trim();
    const at=value.toLocaleLowerCase().indexOf(needle);
    const from=Math.max(0,at-34),to=Math.min(value.length,at+needle.length+74);
    return (from?'…':'')+value.slice(from,to)+(to<value.length?'…':'');
  };
  return developerGuides.flatMap(guide=>{
    const sections=[
      {section:'overview',label:'Overview',values:[guide.title,guide.summary,guide.group,guide.when,guide.provides]},
      {section:'prerequisite',label:'Before you start',values:[guide.prerequisite]},
      {section:'scope',label:'Request scope',values:(guide.endpointChoices||[]).flatMap(x=>[x.name,x.when,x.policy,x.guards,x.ownership])},
      {section:'failures',label:'Failure and recovery',values:(guide.failureCases||[]).flatMap(x=>[x.trigger,x.gate,x.failure,x.recovery,x.owner])},
      {section:'decisions',label:'Idempotency decisions',values:(guide.decisionStates||[]).flatMap(x=>[x.type,x.effect,x.owner,x.next,x.recovery])},
      {section:'recovery',label:'Recovery cases',values:(guide.recoveryPaths||[]).flatMap(x=>[x.case,x.explanation,x.verify,x.owner])},
      {section:'conformance',label:'Conformance evidence',values:(guide.conformanceCases||[]).flatMap(x=>[x.id,x.title,x.evidence])},
      {section:'steps',label:'Steps',values:guide.steps},
      ...guide.samples.map((sample,i)=>({section:'example',label:'Example: '+sample.label,values:[sample.label,sample.kind,sample.filename,sample.code],sampleIndex:i})),
      {section:'troubleshooting',label:'Troubleshooting',values:guide.mistakes},
      {section:'verification',label:'Verification',values:[guide.verify]},
      {section:'ownership',label:'Ownership',values:[guide.ownership,guide.diagnostics||'']}
    ];
    for(const section of sections){
      const found=section.values.find(value=>String(value??'').toLocaleLowerCase().includes(needle));
      if(found!==undefined)return [{guide,section:section.section,label:section.label,excerpt:excerpt(found),sampleIndex:section.sampleIndex??null}];
    }
    return [];
  });
}

// Backward-compatible guide filtering, shared with the contextual search UI.
export function searchDeveloperGuides(query){
  return searchDeveloperGuideMatches(query).map(result=>result.guide);
}
