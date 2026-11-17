import {version} from './data.mjs';

// Published-release examples only. Candidate APIs belong in the separate preview.
export const documentationVersion = version;
export const developerGuides = [
  {
    "id": "install",
    "group": "Getting started",
    "title": "Install the released library",
    "summary": "Add the smallest dependency, with no server or database required.",
    "prerequisite": "Java 21+ and Maven or Gradle. Maven Central needs no custom repository credentials.",
    "when": "Every new consumer starts here. Add JDBC or testkit only for a demonstrated requirement.",
    "steps": [
      "Install platform-kernel from Maven Central using the v0.3.2 coordinates.",
      "Keep Java imports under io.vyrnforge.platform.kernel; the Maven group and package namespace differ.",
      "Do not include the optional JDBC adapter or testkit unless needed; keep testkit test-scoped."
    ],
    "samples": [
      {
        "label": "Maven",
        "kind": "Runnable dependency configuration",
        "language": "xml",
        "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel</artifactId>\n  <version>0.3.2</version>\n</dependency>"
      },
      {
        "label": "Gradle",
        "kind": "Runnable dependency configuration",
        "language": "kotlin",
        "code": "repositories { mavenCentral() }\n\ndependencies {\n  implementation(\"io.github.vyrnforge:platform-kernel:0.3.2\")\n}"
      }
    ],
    "verify": "Confirm that the resolved artifact is platform-kernel:0.3.2; remove old split-artifact and legacy group coordinates.",
    "ownership": "Your application controls its build and runtime. Kernel is an embedded Java library, not a hosted service.",
    "guide": "docs/integration/three-jar-distribution.md",
    "source": "pom.xml"
  },
  {
    "id": "first",
    "group": "Getting started",
    "title": "Your first Java program",
    "summary": "Generate UUIDv7 identifiers and correlation context without an identity provider.",
    "prerequisite": "The main v0.3.2 JAR from the installation guide.",
    "when": "A service, CLI or worker needs consistent identifiers or correlation before deeper integration.",
    "steps": [
      "Create a Java 21 class with a main method.",
      "Generate a UUIDv7 and a correlation context using the released core APIs.",
      "Carry correlation across related work; use real product-owned IDs and transport wiring in production."
    ],
    "samples": [
      {
        "label": "Java 21",
        "kind": "Complete Java example",
        "language": "java",
        "code": "import io.vyrnforge.platform.kernel.ids.UuidV7;\nimport io.vyrnforge.platform.kernel.context.CorrelationContext;\n\npublic final class FirstKernelProgram {\n  public static void main(String[] args) {\n    var id = UuidV7.generate();\n    var correlation = CorrelationContext.create();\n    System.out.println(id);\n    System.out.println(correlation.correlationId());\n  }\n}"
      }
    ],
    "verify": "Compile and execute against platform-kernel:0.3.2. No database, IAM, broker or testkit is required.",
    "ownership": "Your application chooses when to create and propagate correlation context. Kernel does not implement your HTTP server or logger.",
    "guide": "docs/integration/quickstart.md",
    "source": "verification/GeneralUsageExample.java"
  },
  {
    "id": "request",
    "group": "Integrate",
    "title": "Resolve a trusted request",
    "summary": "Compose tenantless or tenant-scoped policy without outsourcing resource authorization.",
    "prerequisite": "A real authentication verifier, trusted identity projection and application-owned domain policy. Tenant-scoped operations also need authoritative membership and module entitlements.",
    "when": "An authenticated endpoint needs a normalized actor, tenant guard and explicit resource authorization.",
    "steps": [
      "Construct RequestContextPipeline with a trusted identity adapter and application-supplied membership, entitlement and domain authorization ports.",
      "For global operations choose EndpointPolicy.tenantless and TenantContext.none; they are still authenticated and authorized.",
      "For tenant-owned operations choose EndpointPolicy.tenantModule with one active tenant; authorize the actual resource and scope database reads/writes to it.",
      "Never trust a tenant or owner ID merely because it appeared in a client header."
    ],
    "samples": [
      {
        "label": "Tenantless",
        "kind": "Integration excerpt — pipeline and verifiedIdentity are application-supplied",
        "language": "java",
        "code": "var profile = pipeline.resolve(new RequestContextInput<>(\n    verifiedIdentity,\n    TenantContext.none(),\n    CorrelationContext.create(),\n    EndpointPolicy.tenantless(\"profile.read\"),\n    null));\n// Authenticated + domain-authorized; no tenant-owned resource."
      },
      {
        "label": "Tenant-scoped",
        "kind": "Integration excerpt — pipeline, verifiedIdentity, tenantId and recordId are application-supplied",
        "language": "java",
        "code": "var record = new ResourceReference(\"record\", recordId, tenantId);\nvar context = pipeline.resolve(new RequestContextInput<>(\n    verifiedIdentity,\n    TenantContext.tenant(tenantId),\n    CorrelationContext.create(),\n    EndpointPolicy.tenantModule(\"records\", \"records.read\"),\n    record));\n// The application's query must also enforce tenant ownership."
      }
    ],
    "verify": "Test missing membership, disabled entitlement, wrong-tenant resource and denied resource permission; all must fail closed.",
    "ownership": "The identity provider authenticates. The Kernel applies shared guards. Your application owns permissions, resource truth and tenant-filtered data access.",
    "guide": "docs/integration/identity-boundary.md",
    "source": "verification/GeneralUsageExample.java"
  },
  {
    "id": "jdbc",
    "group": "Integrate",
    "title": "Make a retriable write durable",
    "summary": "Persist domain changes, required event/audit intents and replay result atomically.",
    "prerequisite": "The optional platform-kernel-jdbc:0.3.2 artifact, product-owned PostgreSQL transaction and applicable Flyway migrations. Authenticate and authorize every attempt before idempotency acquisition.",
    "when": "A tenant-scoped mutation may be retried and must survive a lost response without duplicating its authoritative write.",
    "steps": [
      "Acquire using JdbcIdempotencyPort.begin with a caller/target-aware fingerprint.",
      "Only ACQUIRED executes domain SQL; call executeIdempotent with the supplied connection and event/audit ports.",
      "Handle REPLAY only after current authorization; return safe responses for IN_PROGRESS and CONFLICT.",
      "Operate the outbox independently; receivers deduplicate and operators reconcile uncertain or DEAD events."
    ],
    "samples": [
      {
        "label": "Maven adapter",
        "kind": "Optional dependency configuration",
        "language": "xml",
        "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel-jdbc</artifactId>\n  <version>0.3.2</version>\n</dependency>"
      },
      {
        "label": "Java recipe",
        "kind": "Integration excerpt — all ports, request and safeResult are application-supplied",
        "language": "java",
        "code": "var decision = idempotencyPort.begin(request);\nswitch (decision.type()) {\n  case ACQUIRED -> transactions.executeIdempotent(\n      decision.lease(), IdempotencyResultCodec.strings(),\n      (connection, events, audits) -> {\n        // Write product-owned SQL on connection.\n        // Record required event/audit intents via the supplied ports.\n        return safeResult;\n      });\n  case REPLAY -> { var result = decision.replay().result(); }\n  case IN_PROGRESS, CONFLICT -> { /* safe API response */ }\n}"
      }
    ],
    "verify": "Prove rollback, lost-response replay, conflict, expiry, concurrent retry and tenant isolation against real application SQL; an illustrative recipe does not prove production integration.",
    "ownership": "Your product owns SQL, connection, authorization, audit evidence and event consumers. The outbox is at-least-once compatible, not exactly-once.",
    "guide": "docs/integration/jdbc-safe-mutation.md",
    "source": "kernel-persistence-jdbc/"
  },
  {
    "id": "assure",
    "group": "Test & operate",
    "title": "Verify your consumer",
    "summary": "Use test-only helpers, then validate the real identity, database and recovery paths.",
    "prerequisite": "A pinned application source revision and an explicit list of operations that consume the Kernel.",
    "when": "Before adopting a Kernel version or declaring an integration production-ready.",
    "steps": [
      "Keep platform-kernel-testkit in test scope only; it is not a production service.",
      "Test success and negative authorization/tenant boundaries using your actual integration wiring.",
      "For JDBC consumers, verify real transaction atomicity, replay and outbox recovery using product SQL.",
      "Record exact artifact digest, app revision, test evidence, rollback and operational ownership."
    ],
    "samples": [
      {
        "label": "Maven testkit",
        "kind": "Test-only dependency configuration",
        "language": "xml",
        "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel-testkit</artifactId>\n  <version>0.3.2</version>\n  <scope>test</scope>\n</dependency>"
      }
    ],
    "verify": "Run the consumer conformance checklist with actual product fixtures. Kernel CI and simulated demos are not proof of a consumer's production readiness.",
    "ownership": "The consuming application owns its authorization, database, SLOs, rollback plan, upgrade choice and independent acceptance.",
    "guide": "docs/integration/consumer-conformance.md",
    "source": "kernel-testkit/"
  }
];
