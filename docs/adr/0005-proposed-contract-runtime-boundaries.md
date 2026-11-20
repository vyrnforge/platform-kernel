# ADR-0005 (PROPOSED): Contracts–runtime library boundaries

**Date:** 2026-11-20  
**Status:** PROPOSED — not an approved architecture replacement, packaging migration, or release.  
**Baseline:** protected `main@706db703ea2a2e98f036d397b9e7d1e7f75291a0`; published immutable `v0.3.2@c86eb33a46fae2843c75181c6b395cd0dc6710fe`.  
**Owners to review:** Product Owner, Platform Architecture, Kernel API owner, File Storage/Asset consumer owner, Security/QA and Release owner.

## 1. Problem statement

The approved **G1–G8** are consumer *capability headings*, not a valid basis for eight JARs or eight services. The current three published JARs are reasonably small, but `platform-kernel` contains both stable cross-product contracts (DTOs, ports, typed IDs, event/audit/idempotency envelopes) and executable composition (HTTP adapter, request pipeline, correlation/health adapters). This makes the *minimal product consumption surface* ambiguous.

The observed main tree has **88 production Java files**: 65 core, 14 optional JDBC, 9 testkit. The core has **zero production third-party dependencies**, so reducing dependency *size* is not in itself a compelling reason to split it. There are 26 historical v0.1/v0.2 JSON/manifest/example resources and three immutable JDBC Flyway V1–V3 SQL resources. The exact published v0.3.2 bytecode and source-level consumer compatibility contracts must remain immutable.

### Source-dependency findings (current main)

- `context.ModuleEntitlement` imports `module.ModuleKeys`: any future contracts extraction must keep both in the same lower-level artifact or explicitly relocate the validator. Do **not** split the `context` and `module` packages across independently versioned artifacts.
- `observability.TelemetryAttributes` imports `pipeline.ResolvedRequestContext`: operational telemetry depends on request composition. Placing all observability types in a contracts-only artifact would invert the dependency rule.
- `http.HttpRequestContextAdapter` imports `pipeline.RequestContextPipeline`, `observability.CorrelationPropagation`, context, errors and IDs. HTTP is a composed *adapter*, not the portable contracts layer.
- `audit.AuditEvent`, `event.EventEnvelope`, `config.ConfigurationPort`, `feature.FeatureFlagPort`, `file.FileReference`, `idempotency.IdempotencyRequest` depend only on lower-level IDs/context/ports and suit a contracts boundary.
- JDBC remains the optional technology adapter; consumer-selected transaction/SQL/restore, IAM authentication, File Storage grants, transport broker and product authorization must not move into Kernel.

## 2. Target design — CONDITIONAL (four artifacts, NOT eight)

If consumer use and review justify the additional publication/migration cost, propose:

| Future artifact | Responsibility | Java package ownership | Dependency rule |
| --- | --- | --- | --- |
| `platform-kernel-contracts` (NEW) | Stable DTOs, interface ports, typed IDs and portable contract resources | **Whole-package candidates:** `audit`, `config`, `context`, `controls`, `errors`, `event`, `feature`, `file`, `idempotency`, `ids`, `module`, `ports`. Current 41 Java sources. | Java 21, no runtime external dependencies, never imports runtime/HTTP/JDBC/testkit/product packages |
| `platform-kernel` (RETAIN coordinates) | Embedded request composition/integration and diagnostics | **Whole-package candidates:** `health`, `http`, `identity`, `observability`, `pipeline`. Current 24 Java sources. | Depends on contracts, not JDBC or testkit |
| `platform-kernel-jdbc` (RETAIN) | Optional relational reliability implementation | Existing `persistence.jdbc` (14 sources), V1–V3 migrations | Depends on contracts; adding runtime dependency only with proven need; keeps Flyway/Jackson/PostgreSQL optional |
| `platform-kernel-testkit` (RETAIN) | Deterministic test fakes | Existing `testkit` (9 sources) | Depends on contracts and, if necessary, core in test scope; never a production runtime dependency |

The proposed split keeps the **same Java fully-qualified class names** by moving **entire** package directories between Maven source roots (not renaming them). Do not let two artifacts ship the same binary FQCN; this is also safer for JPMS than splitting individual Java packages across JARs. `platform-kernel` would declare a normal transitive Maven dependency on `platform-kernel-contracts` so existing Maven consumers can retain their dependency and source imports. A library that uses just `UuidV7` and `FileReference` could depend on `platform-kernel-contracts` directly after actual publication.

This is a **four-library hypothesis**, not permission to update VERSION or ship an additional artifact. It directly conflicts with the approved three-JAR distribution under DEC-K022 and DEC-K039's **catalogue-only** adoption; a new explicit architecture/packaging decision and release plan are required.

## 3. G1–G8 → actual module responsibility mapping

- G1: context DTOs and membership/authorization ports → contracts; credential projection and request pipeline → runtime. IAM verifies credentials, products authorize records.
- G2: UUIDv7/opaque references → contracts; schema/manifest packaging destination requires a deliberate compatibility decision.
- G3: error DTOs → contracts; HTTP metadata/credential extraction/errors adapters → runtime.
- G4: correlation DTO → contracts; telemetry policy/propagation and synchronous health aggregator/types → runtime for the initial whole-package split.
- G5: module registry/key validation, entitlements/config/flag ports → contracts (a tiny in-process static registry stays bundled as a tradeoff). Provider and live policies stay external.
- G6: event/audit DTOs and intent ports → contracts; actual JDBC writers → JDBC. Audit intent is not authoritative evidence or broker delivery.
- G7: idempotency API/contracts → contracts; atomic mutation/replay/outbox/Flyway → optional JDBC. No hosted publisher, exactly-once or receiver inbox.
- G8: test-only fakes → testkit, with additional conformance jobs in repository CI; not a fourth operated service.

**Known tradeoff:** `StaticProductModuleRegistry` is a small executable helper in `module`. Keeping the *whole* `module` package in contracts avoids a split Java package, but the contracts artifact becomes 'portable contracts + pure helpers', not literally DTO/interface-only. Do not hide this exception.

## 4. Decision options

**A — Three JARs, enforced Java package dependency rules (immediate, low risk).** Preserve all distribution and classpaths; introduce a fail-closed boundary checker, use explicit consumer documentation for PORT/DTO/HELPER/ADAPTER/TEST distinctions, and measure who actually needs contracts without HTTP. This can be merged independently as non-runtime test tooling after normal review. It is the smallest safe first step.

**B — Four JARs, one new contracts artifact (target only after evidence).** Extract the 41 whole-package sources from core, make the 24 runtime classes depend on them, and preserve existing FQCNs and default core Maven dependency. Requires new artifact provenance, source/Javadoc/resource mapping, release-script changes, independent consumer tests, backward binary/source/resource compatibility and a separately versioned publication decision. Not a docs-only refactor.

**C — Eight artifacts/services matching G1–G8.** REJECT. The groups overlap, core request composition crosses G1/G3/G4/G5, and this would create unnecessary dependency/version churn without demonstrated domain ownership benefits.

**Recommended:** Implement/test A now. Approve B only if actual Asset + File Storage (or ITSM) consumers demonstrate independent contracts use, measurable library-onboarding/release benefits, and pass backward compatibility. Do not implement C.

## 5. Exact migration gates for future B (NOT currently met)

1. Record a **new** owner/Architecture decision explicitly superseding DEC-K022's three-JAR distribution without changing G1–G8 catalogue, the IAM/File Storage boundary or three existing artifact names. Mark compatibility and published version status accurately.
2. Establish a complete 88-class/source-to-target ownership manifest (this ADR covers the entire current 65-core classification); validate no contract-to-runtime or contract-to-JDBC dependency, no split Java packages and no circular Maven dependency. Test pure classpath and JPMS risk.
3. Preserve all previously published Java FQCNs/signatures unless separately accepted as breaking. Build an aggregate classpath ABI/source-comparison check across the **combined** new contracts+core artifacts; the existing *single-JAR* CAPAUD-01 comparator correctly flags moved classes and cannot simply be disabled. Retain six known constructor behavior-change acceptance gates.
4. Decide where to ship the existing 26 JSON resources and how to preserve classloader lookups, `jar tf` consumers, Maven source/Javadoc JARs and document deep links. Do not duplicate canonical resources in two runtime JARs without an explicit precedence policy. Leave JDBC V1–V3 migration bytes/paths invariant.
5. Update parent POM, all internal module dependencies, **four runtime JAR** staging/signature/checksum inventory, Central/GitHub Packages/GitHub Release publishing, anonymous smoke and recovery. Keep versions immutable; no republish of `0.3.2` under changed bytes.
6. Compile **published core v0.3.2 consumer** vs future version on Java 21, File Storage current real source, Asset reference contract app and independent ITSM if available. Confirm direct vs transitive Maven deps, Java 25 IAM only if actually adopted, and behaviour of no-JDBC clients.
7. Obtain Product/API/Security/JDBC/QA independent or explicitly scope-bounded acceptance, deployed tenant/credential/grant and recovery evidence and explicit release owner authorization. Passing CI is necessary but insufficient.
8. Measure onboarding and lifecycle benefit against option A; if no demonstrated value or unacceptable compatibility cost, retain three JARs.

## 6. Scope and prohibited shortcuts

Do not move IAM, File Storage, Asset/ITSM business records, permissions, JWT verification, broker, scheduler, workflow/BPM, custom-field engine, AI, notification runtime, licensing or generic analytics into the Kernel. Do not join cross-product databases. Maintain default core and optional JDBC/testkit separation, Java 21 floor, versioned contracts and fail-closed request ownership.

This document and the companion package-boundary checker create **architecture evidence**, not an approved physical refactor, v0.4.0 release or independent security sign-off.
