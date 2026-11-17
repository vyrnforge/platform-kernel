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
      "Use Java 21 or newer (check `java -version` and your build tool's JDK).",
      "Add the released platform-kernel dependency from Maven Central; these snippets belong in an existing Maven or Gradle Java project.",
      "Keep Java imports under io.vyrnforge.platform.kernel, even though the Maven group is io.github.vyrnforge.",
      "Add platform-kernel-jdbc only for durable PostgreSQL reliability; add platform-kernel-testkit only in the test scope."
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
    "verify": "Check the resolved coordinates with `mvn dependency:tree` or `./gradlew dependencies`. The selected runtime JAR must be io.github.vyrnforge:platform-kernel:0.3.2.",
    "ownership": "Your application controls its build and runtime. Kernel is an embedded Java library, not a hosted service.",
    "guide": "docs/integration/three-jar-distribution.md",
    "source": "pom.xml",
    "provides": "A dependency-light Java 21 core library with request context, IDs, cross-cutting contracts and basic utilities. No hosted Kernel server.",
    "mistakes": [
      "An XML <dependency> fragment is not a complete pom.xml; insert it inside your project's <dependencies> element. Gradle Kotlin DSL snippets belong in build.gradle.kts.",
      "Remove legacy split artifact IDs (platform-kernel-core, platform-kernel-http and others) and the old io.vyrnforge.platform group instead of mixing versions.",
      "If compilation fails, verify JDK 21+, dependency resolution and the difference between Maven group ID and Java package name."
    ]
  },
  {
    "id": "first",
    "group": "Getting started",
    "title": "Your first Java program",
    "summary": "Generate UUIDv7 identifiers and correlation context without an identity provider.",
    "prerequisite": "The main v0.3.2 JAR from the installation guide.",
    "when": "A service, CLI or worker needs consistent identifiers or correlation before deeper integration.",
    "steps": [
      "Create `FirstKernelProgram.java` in an empty working directory and paste the Java 21 example.",
      "Select the Run tab to download the published JAR using Maven, then compile and run the class.",
      "Confirm that it prints two UUID values; each run creates new IDs.",
      "Propagate correlation across your own HTTP, event or job boundaries as needed; the Kernel does not install middleware automatically."
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
        "kind": "Commands after saving FirstKernelProgram.java (macOS / Linux)",
        "language": "bash",
        "filename": "terminal",
        "code": "mvn org.apache.maven.plugins:maven-dependency-plugin:3.7.1:copy \\\n  -Dartifact=io.github.vyrnforge:platform-kernel:0.3.2 \\\n  -DoutputDirectory=.\njavac --release 21 -cp platform-kernel-0.3.2.jar FirstKernelProgram.java\njava -cp \".:platform-kernel-0.3.2.jar\" FirstKernelProgram"
      }
    ],
    "verify": "The program should print two valid UUIDv7 values. On Windows, replace the `:` classpath separator with `;`; Maven Central and Java 21 must be accessible.",
    "ownership": "Your application chooses when to create and propagate correlation context. Kernel does not implement your HTTP server or logger.",
    "guide": "docs/integration/quickstart.md",
    "source": "verification/GeneralUsageExample.java",
    "provides": "UuidV7.generate() and CorrelationContext.create() are public methods in the v0.3.2 source; no request pipeline is required for this standalone example.",
    "mistakes": [
      "Save the Java tab as FirstKernelProgram.java; the class name and filename must match.",
      "If `javac` is missing or compilation reports unsupported release, use a JDK rather than a JRE and confirm Java 21+.",
      "The CLI classpath uses `:` on macOS/Linux and `;` on Windows. For a real project, let Maven or Gradle manage dependencies."
    ]
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
