export const preview={
  "version": "0.4.0",
  "status": "NOT RELEASED",
  "published": "0.3.2",
  "sourceCommit": "f8cbdfe983d951e40d050b6a83c7c1ff1d065ab3",
  "summary": "Prepared ahead of publication. Use the published v0.3.2 installation and source examples for real applications until v0.4.0 has been released and verified.",
  "changes": [
    {
      "area": "Authenticated tenantless requests",
      "change": "New RequestContextPipeline.tenantless(identityAdapter, domainAuthorizationHook) factory; existing full constructor remains.",
      "action": "Verify real credentials, denied tenant-owned resources, tenant-scoped policies and application-owned resource authorization."
    },
    {
      "area": "Module keys",
      "change": "Shared released v0.2 grammar: ^[a-z][a-z0-9_.:-]*$, maximum 128 characters; more namespaced keys accepted by registry, invalid tenant-scoped keys rejected earlier.",
      "action": "Inventory module IDs and error mapping; entitlement still does not grant record-level permissions."
    },
    {
      "area": "Idempotency limits",
      "change": "IdempotencyRequest validates operation ≤192, key ≤512 and fingerprint ≤512 Unicode code points before JDBC.",
      "action": "Test exact boundaries, request fingerprints, conflicts, expiry, replay and authorization on every attempt."
    },
    {
      "area": "Optional JDBC JSON codec",
      "change": "New JacksonRecordCodec(ObjectMapper); copies input mapper, disables default typing, preserves deterministic map-key order; no-arg constructor retained.",
      "action": "Check stored payload encoding, historical replay/fingerprint stability and DTO policy before opting in."
    },
    {
      "area": "Integration safety",
      "change": "Clarified duplicate HTTP header handling, host-owned Flyway history, synchronous health timeouts and atomic JDBC mutation guidance.",
      "action": "Prove actual product integration, negative cases, migration authority and operational recovery."
    }
  ],
  "samples": [
    {
      "id": "maven",
      "label": "Maven",
      "language": "xml",
      "filename": "pom.xml · future dependency fragments",
      "note": "Prepared for after publication; do not resolve 0.4.0 now.",
      "code": "<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel</artifactId>\n  <version>0.4.0</version>\n</dependency>\n<!-- Add only if product-owned PostgreSQL reliability is needed -->\n<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel-jdbc</artifactId>\n  <version>0.4.0</version>\n</dependency>\n<!-- Test scope only -->\n<dependency>\n  <groupId>io.github.vyrnforge</groupId>\n  <artifactId>platform-kernel-testkit</artifactId>\n  <version>0.4.0</version>\n  <scope>test</scope>\n</dependency>"
    },
    {
      "id": "gradle",
      "label": "Gradle",
      "language": "kotlin",
      "filename": "build.gradle.kts · future dependency fragments",
      "note": "For an existing Java 21+ Gradle project, after publication only.",
      "code": "repositories { mavenCentral() }\ndependencies {\n  implementation(\"io.github.vyrnforge:platform-kernel:0.4.0\")\n  // Optional PostgreSQL reliability adapter:\n  implementation(\"io.github.vyrnforge:platform-kernel-jdbc:0.4.0\")\n  testImplementation(\"io.github.vyrnforge:platform-kernel-testkit:0.4.0\")\n}"
    },
    {
      "id": "tenantless",
      "label": "Tenantless factory",
      "language": "java",
      "filename": "TenantlessHandler.java · integration excerpt",
      "note": "Candidate-only API. trustedIdentity must be produced by a real IAM/IdP verifier, not untrusted headers.",
      "code": "// Candidate v0.4.0: this factory is NOT in released v0.3.2.\nvar pipeline = RequestContextPipeline.tenantless(\n    new ValidatedIdentityAdapter(),\n    (actor, action, resource) ->\n        actor.authorization().hasPermission(action));\nvar resolved = pipeline.resolve(new RequestContextInput<>(\n    trustedIdentity, TenantContext.none(), CorrelationContext.create(),\n    EndpointPolicy.tenantless(\"profile.read\"), null));"
    },
    {
      "id": "keys",
      "label": "Module keys",
      "language": "java",
      "filename": "ModuleSetup.java · integration excerpt",
      "note": "Module identity and resource action are different concepts; this is candidate source-level validation.",
      "code": "import io.vyrnforge.platform.kernel.module.ProductModule;\nimport io.vyrnforge.platform.kernel.module.ModuleKeys;\nimport io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;\nvar module = new ProductModule(\"asset.inventory\");\nvar policy = EndpointPolicy.tenantModule(\"asset.inventory\", \"asset.read\");\nModuleKeys.require(\"asset.inventory\"); // Allowed namespaced module key\n// ModuleKeys.require(\"ASSET\"); // Throws IllegalArgumentException"
    },
    {
      "id": "jdbc",
      "label": "JDBC codec",
      "language": "java",
      "filename": "JdbcWiring.java · integration excerpt",
      "note": "The ObjectMapper constructor is a v0.4.0 candidate-only addition; compare old persisted JSON before changing mapper behavior.",
      "code": "import com.fasterxml.jackson.databind.ObjectMapper;\nimport io.vyrnforge.platform.kernel.persistence.jdbc.JacksonRecordCodec;\nObjectMapper appMapper = new ObjectMapper();\n// Register only reviewed application JSON modules / DTO settings.\nJacksonRecordCodec codec = new JacksonRecordCodec(appMapper);"
    }
  ],
  "checks": [
    "Confirm the release is signed, tagged and anonymously resolvable on Maven Central before using any 0.4.0 dependency. Record exact digests and avoid mixed artifact versions.",
    "Compile and execute the actual consuming Java 21+ application, checking source/binary compatibility, dependency tree and separate optional JDBC/testkit scopes.",
    "Test real verifier failures, tenantless positive/denied flows, tenant-owned resource rejection, active tenant mismatch, membership, effective entitlement, resource permissions and tenant-filtered SQL.",
    "Test module-key grammar (lowercase ASCII, max 128) and idempotency operation/key/fingerprint exact 192/512/512 Unicode-codepoint boundaries and error mapping.",
    "If using JDBC, test historical mapper payloads and replay fingerprints, commit/rollback, duplicate deliveries, same/different key replay, IN_PROGRESS, CONFLICT, concurrent retry, lost response and DEAD claim recovery.",
    "If using Flyway, verify V1–V3 checksums, classpath discovery, product-owned migration history, deployment drain, least-privilege role, backup, restore and rollback.",
    "Verify safe correlation, redacted telemetry, bounded health probe I/O and product-specific readiness behavior. Document owner acceptance and remaining gaps."
  ],
  "mistakes": [
    {
      "symptom": "The tenantless factory or JacksonRecordCodec(mapper) does not compile",
      "fix": "Those APIs are not available in the published v0.3.2 JAR. Keep v0.3.2 code until a separately approved release is published."
    },
    {
      "symptom": "Tenantless endpoint unexpectedly denies access",
      "fix": "Check active tenant, tenant-owned resource and application policy. Tenantless is still authenticated and domain-authorized."
    },
    {
      "symptom": "Module key is rejected",
      "fix": "Use a lowercase ASCII letter followed by lowercase letters, digits, _, ., : or -, max 128. Do not confuse module entitlement with resource permission."
    },
    {
      "symptom": "Idempotency validation fails earlier",
      "fix": "Validate the 192/512/512 Unicode code-point limits; never truncate a key or fingerprint silently."
    },
    {
      "symptom": "Stored JDBC JSON or replay result differs",
      "fix": "Restore a known-compatible codec configuration and compare old payload/fingerprint fixtures before rollout. Do not enable arbitrary default typing."
    },
    {
      "symptom": "Flyway migration collisions",
      "fix": "Do not blindly run KernelJdbcMigrator against an application-owned migration history. Follow the host's reviewed migration plan."
    },
    {
      "symptom": "Readiness probe hangs",
      "fix": "HealthAggregator runs synchronously and does not impose a deadline. Set bounded client I/O and endpoint-level timeouts in the product."
    }
  ]
};
// Content lives in the website, not a duplicate repository-facing guide.
export function searchPreview(query) {
  const term=query.trim().toLocaleLowerCase();
  if (!term) return true;
  return JSON.stringify(preview).toLocaleLowerCase().includes(term);
}
