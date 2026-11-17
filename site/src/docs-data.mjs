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
    "summary": "Compose tenantless or tenant-scoped policy without outsourcing resource authorization.",
    "prerequisite": "A real authentication verifier, trusted identity projection and application-owned domain policy. Tenant-scoped operations also need authoritative membership and module entitlements.",
    "when": "An authenticated endpoint needs a normalized actor, tenant guard and explicit resource authorization.",
    "steps": [
      "Verify credentials with your application/IAM/IdP; map the trusted result through a ValidatedIdentityAdapter or your own IdentityAdapter.",
      "Compose RequestContextPipeline with the identity, membership, module-entitlement and DomainAuthorizationHook ports. The last three are application-supplied; the domain hook is required even for tenantless endpoints.",
      "For explicitly tenantless operations, use EndpointPolicy.tenantless and TenantContext.none. Never infer that tenantless means anonymous.",
      "For tenant-owned operations, use EndpointPolicy.tenantModule with exactly one authorized tenant. Enforce resource-level policy and tenant filtering in your SQL.",
      "At the HTTP boundary, use HttpRequestContextAdapter only after your framework has handled trusted request metadata. Propagate correlation IDs and safely map failures."
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
      }
    ],
    "verify": "Test missing membership, disabled entitlement, wrong-tenant resource and denied resource permission; all must fail closed.",
    "ownership": "The identity provider authenticates. The Kernel applies shared guards. Your application owns permissions, resource truth and tenant-filtered data access.",
    "guide": "docs/integration/identity-boundary.md",
    "source": "verification/GeneralUsageExample.java",
    "provides": "Framework-neutral request pipeline, explicit tenant/module guards, correlation metadata and HTTP edge helpers. It does not verify a raw JWT or authorize business resources for you.",
    "mistakes": [
      "A Bearer token extractor only extracts a token. Your authentication layer must validate issuer, signature, expiry and audience before building trusted identity.",
      "Module entitlement answers whether the module is enabled; it does not grant record-level access. Feature flags are not permissions either.",
      "A tenantless request with an active tenant is rejected. For tenant-scoped reads and writes, do not treat a client-provided resource tenant ID as authoritative."
    ]
  },
  {
    "id": "jdbc",
    "group": "Integrate",
    "title": "Make a retriable write durable",
    "summary": "Persist domain changes, required event/audit intents and replay result atomically.",
    "prerequisite": "The optional platform-kernel-jdbc:0.3.2 artifact, product-owned PostgreSQL transaction and applicable Flyway migrations. Authenticate and authorize every attempt before idempotency acquisition.",
    "when": "A tenant-scoped mutation may be retried and must survive a lost response without duplicating its authoritative write.",
    "steps": [
      "Add platform-kernel-jdbc:0.3.2, configure an application-owned DataSource, and apply the adapter's packaged Flyway V1–V3 migrations to that database.",
      "Authenticate, check active tenant, module entitlement and domain authorization on every attempt, including retries.",
      "Acquire with JdbcIdempotencyPort.begin using a caller/target/payload-aware fingerprint; only ACQUIRED executes the business SQL.",
      "Execute product SQL and required event/audit intents through executeIdempotent on its supplied Connection. Never commit or call external services inside the callback.",
      "On REPLAY return a still-authorized safe result; handle IN_PROGRESS and CONFLICT explicitly. Operate the outbox and reconcile uncertain/DEAD events separately."
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
    "verify": "Prove rollback, lost-response replay, conflict, expiry, concurrent retry and tenant isolation against real application SQL; an illustrative recipe does not prove production integration.",
    "ownership": "Your product owns SQL, connection, authorization, audit evidence and event consumers. The outbox is at-least-once compatible, not exactly-once.",
    "guide": "docs/integration/jdbc-safe-mutation.md",
    "source": "kernel-persistence-jdbc/",
    "provides": "Optional PostgreSQL/Flyway adapter for lease-backed idempotency, atomic writes with intents, append-oriented audit and a claim-fenced outbox. Delivery remains at-least-once-compatible.",
    "mistakes": [
      "Running business SQL on a second connection breaks the atomicity guarantee. Work must use the supplied Connection.",
      "A lost response can be replayed only while the key is retained; expiry allows re-execution. Reauthorize before returning replayed data.",
      "The library does not start an outbox worker, broker or migration runner automatically. Monitor exhausted/DEAD claims and deduplicate at the consumer."
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
      "Keep platform-kernel-testkit:0.3.2 in Maven test scope; never ship fixtures as production authentication, policy or persistence.",
      "Run `mvn test` (or your project's Gradle test task) with actual application wiring for success, denied identity, tenant mismatch, missing membership, disabled modules and resource access denial.",
      "If using JDBC, test against your product SQL and PostgreSQL: transaction rollback, replay, conflicting fingerprints, concurrent retries and lost-response recovery.",
      "Record exact Maven coordinates, application revision, conformance evidence, rollback approach, operational owner and any unresolved exceptions."
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
    "verify": "Run the consumer conformance checklist with actual product fixtures. Kernel CI and simulated demos are not proof of a consumer's production readiness.",
    "ownership": "The consuming application owns its authorization, database, SLOs, rollback plan, upgrade choice and independent acceptance.",
    "guide": "docs/integration/consumer-conformance.md",
    "source": "kernel-testkit/",
    "provides": "Deterministic in-memory membership, entitlement, audit/event and idempotency test adapters for consumer tests; not an operational certification tool.",
    "mistakes": [
      "A green Kernel repository pipeline or Playground simulation does not prove your application integration is secure.",
      "Test the same tenant/resource authorization paths in production wiring, not only with permissive test fixtures.",
      "Keep event delivery, backups, transaction recovery, observability and rollback in the application runbook."
    ]
  }
];

// Search the guidance developers actually need, not only the navigation labels.
export function searchDeveloperGuides(query) {
  const needle=query.trim().toLocaleLowerCase();
  if(!needle)return developerGuides;
  return developerGuides.filter(guide=>[
    guide.title,guide.summary,guide.group,guide.when,guide.prerequisite,
    guide.provides,guide.ownership,guide.verify,...guide.steps,...guide.mistakes,
    ...guide.samples.flatMap(sample=>[sample.label,sample.kind,sample.filename,sample.code])
  ].join(' ').toLocaleLowerCase().includes(needle));
}
