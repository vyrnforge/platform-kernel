# Kernel Capability Opportunity Map — KCOM-001

**Status:** PROPOSED research prioritization, not an approved feature backlog, roadmap commitment, supported API or architecture ADR. As of 17 November 2026 (Asia/Jakarta), Kernel `main` `7cdc1168b52974723cdb9ef31dd36ae57277de6f`; published v0.3.2 source `c86eb33a46fae2843c75181c6b395cd0dc6710fe`. Companion [36-pattern register](kernel-pattern-register.md). This map is exclusively about **Kernel library evolution**; other codebases are optional evidence of repeated technical patterns, not product tasks or dependencies.

## 1. Direction and policy

**North star:** every added common primitive should reduce repeated integration cost or prevent a recurring technical failure **without** reducing independent product control. Current foundation: Java21 dependency-light `platform-kernel` (zero production third-party deps), optional `platform-kernel-jdbc` (Flyway/PostgreSQL/Jackson), `platform-kernel-testkit` for tests; published v0.3.2; immutable released wire v0.2 and JDBC migrations V1–V3. Existing kernel components already cover trusted-context ports, tenant/entitlement/domain-authorization pipeline, IDs, errors/HTTP metadata, event/audit intent, API idempotency, flags/config, health/telemetry, optional JDBC outbox and memory testkit. Do **not** rediscover or rebuild existing functionality.

Controlling approvals: [DEC-K020–029](https://docs.google.com/document/d/1Z01AcARfMyE0aIbQZADP8xf_dA0U7Pfg95IJHmKwrhM), [Strategy](kernel-evolution.md), [Architecture v0.3](https://docs.google.com/document/d/1esvwqcLVpKV2-3j37OjnvlUoUa1w8jmvj7S6Lawtlss), [FAA-01–05](../integration/operations-and-measurement.md). Discover → Design → Experiment → Promote → Adopt, independently gated. Existing [#41](https://github.com/vyrnforge/platform-kernel/issues/41) is consumer conformance, while [draft #47](https://github.com/vyrnforge/platform-kernel/pull/47) is deeper RD-01/RD-02 research and artifact evidence, **not yet merged**. This map references but does not duplicate its current/consumer checkout inventory. Keep #41 open pending separate acceptance, and do not close it by writing research docs.

## 2. Investment lenses (hard gates before opportunity ranking)

A candidate **fails** if it would transfer business ownership or policy, introduce a mandatory shared service/database/runtime or forced upgrade, weaken tenant/identity/file-grant checks, or break supported contract without separately approved migration. For otherwise admissible candidates, record observations and score with **ordinal** evidence, not speculative percentages:

| Lens | Evidence to gather | Good sign | Negative / reject sign |
| --- | --- | --- | --- |
| Recurrence | At least one exact source/use case; independent additional occurrences, revision and owner | Same *failure guarantee* recurs across contexts | Merely shared nomenclature or synthetic copy |
| Semantic match | Inputs, state owner, transaction, scopes, temporal semantics and negative tests | Stable public invariant with distinct adapters | Hidden domain-specific authorization/state |
| Security and failure value | Negative/chaos cases, severity and outcome | Common safeguard closes an actual gap | Helper gives false safety (e.g. external fencing) |
| Integration burden | Setup/adapter lines and effort vs existing solution | Less work without changing runtime choice | Boilerplate increases or framework coupling |
| Lifecycle economics | Development, cross-version testing, adapter, migration, on-call, maintenance; named maintainer | Net benefit against local/mature alternatives | Unfunded dependency or uncertain upkeep |
| Evolution independence | Wire/API/data compatibility and version choice | Old/new consumers interoperate or have a feasible bounded migration | Coordinated release or shared authority required |
| Testability | Reproducible real/simulated boundary cases tied to exact revision | Falsifiable invariants and portable vectors | Claimed parity only from schema shape or unit mocks |

**Decision record fields:** candidate ID, issue/PR and revision; evidence status S/C/N/H; one counterexample; retain/adapt/reject options; proposed home; beneficiary use cases; actual measurement window/denominator; compatibility and rollback; human owner; next validation; approval. If unknown, say UNKNOWN. No approved numeric scores or ROI now. Qualitative P0–P3 in the register are the order to investigate, not a budget.

## 3. Portfolio clustering and Kernel homes

| Cluster | Pattern IDs | Reuse opportunity | Proposed home and scope guard |
| --- | --- | --- | --- |
| Portable interop/compatibility | KPR-01,02,08,24,35,36 | Reusable wire vectors, bidirectional upgrade tests and reference identity semantics | Portable contracts + testkit first; CloudEvents edge map only if demanded; no fourth SDK by default |
| Secure execution context | KPR-04,05,07,26 | Trusted actor/tenant/correlation across HTTP, async jobs and file-reference handoffs | Core invariants + bounded adapters; application verifies credentials, memberships and grants |
| Developer integration ergonomics | KPR-03,06,20,21,22,23 | Less adapter/response/query boilerplate | Optional pure helpers and transport mappings; no query, authz or rate-limit service |
| Durable mutation & events | KPR-13,14,15,16,25 | Atomic operation, evidence and replay; inbound/outbound duplicate safety | Current core/optional JDBC baseline + RD-01; one product-owned transaction and authoritative audit |
| Durable execution | KPR-17,18,19,33 | Claim identity, deadlines, retry and uncertain side-effect semantics | RD-02 contracts first; RD-03 depends on proof, no scheduler/worker engine |
| Controls & metadata | KPR-09,10,30,32 | Config, feature evaluation, typed metadata and time conventions | Core ports exist; provider adapters optional; not billing, policy engine or common business schema |
| Reliability operations | KPR-11,12,34 | Safe health, telemetry, redaction and cache freshness | Pure conventions/optional backend adapters; no centralized observability/cache platform |
| Outbound integration transports | KPR-27,28,29 | Webhook/connector/notification metadata and failure semantics | Deferred until demand; transport adapters only, credentials/preferences/domain actions elsewhere |
| Boundary-sensitive abstractions | KPR-31 | Small stateless transition guards where demonstrably universal | Product-local lifecycle retained unless second equivalent implementation proves value |

## 4. Stage sequence — invest in evidence before features

### Wave A — Strengthen currently shipped foundation (highest near-term value; no new runtime authorized)

**W-A1 Contract portability:** KPR-01/02/08/35. Produce *proposed* executable-vectors design: every released schema, nullable-required key, unknown-field tolerance, canonical UUIDv7, dates, integer precision overflow, safe domain authority checks; validate behavior on both Java and serialized wire rather than trusting record field names. Old and new consumer combinations and schema-preserving behavioral tightening need a compatibility plan. No executable suite authorized by this research.

**W-A2 Trust and async propagation:** KPR-04/05/07/12. Identify missing safe context propagation across threads, jobs and event callbacks; compare explicit parameter passing vs framework adapters. Trace IDs are not actor/tenant authority. Tests must reject mismatched scopes, stale membership and contaminated thread locals.

**W-A3 Developer baseline and release reproducibility:** KPR-03/11/13/14/15. Measure first conformant endpoint and small adapter maintenance; keep core dependency-free, optional JDBC and testkit only. Verify actual published artifact bytes and app checkout, transactional effect+intents, uncertain outbox delivery and recovery. Preserve RPO/RTO owner authority.

**Exit to any implementation proposal:** exact failure case, accepted current behavior, source/test revision, compatibility cost, independent review route and named maintainer. Do not infer a generic framework from missing fixtures.

### Wave B — Common reliability semantics (current approved research priorities)

**W-B1 RD-01 inbox (KPR-16):** scoped event identity, consumer namespace, verified tenantless partition, conflict fingerprint, transactional receipt+business effect+completion vs crash-recoverable separate claim, ack after committed effect, expiry/restore and poison handling. Distinguish inbound dedup from existing tenant-scoped mutation idempotency. Cross-consumer equivalence UNKNOWN. See [existing RD-01 brief](https://github.com/vyrnforge/platform-kernel/blob/d71582051dac84b18b80dfaa367844f447cf0a0f/docs/strategy/next-increment-research-and-adoption.md#b-rd-01--event-inbox--deduplication-research-brief).

**W-B2 RD-02 retry/lease (KPR-17/18):** separate attempt budget, eligibility time, deadline, per-attempt lease, owner token/epoch, current lease check and cancellation. Distinguish storage fencing from remote provider side effects. Reproduce A→B claim takeover and late A completion, same-worker reacquire, max-attempt expiration and crash after transport send. Compare mature retry decorators rather than reimplementing them. See [existing RD-02 brief](https://github.com/vyrnforge/platform-kernel/blob/d71582051dac84b18b80dfaa367844f447cf0a0f/docs/strategy/next-increment-research-and-adoption.md#c-rd-02--retry-deadline-lease-fencing-research-brief).

**W-B3 RD-03 task contracts (KPR-19):** DESIGN BLOCKED on B1/B2 semantics. Research only a typed technical descriptor/attempt/outcome if they genuinely reduce duplicated infrastructure; no workflow/BPM, generic case or job server. IAM ADR-0085 requires independent consumer evidence and E1b/K2 for any IAM JDBC replacement. Neither research brief authorizes the experiment or change.

### Wave C — Transport/API ergonomics (conditional supporting research)

KPR-06,20,21,22,23,24: optional safe problem-response mapping, conditional-write versions, constrained pagination/cursors, bounded sorting, safe 429 retry and event envelope mappings. Compare with accepted API standards and actual adapter friction before a new public contract. No open-ended query DSL; no CloudEvents wire replacement; no error-schema change; product owns resource revision and rate/quota policy.

KPR-09/10: compare typed, exact-scope config and provider-neutral flag evaluation with existing `ConfigurationPort`/`FeatureFlagPort`. Do not accidentally establish implicit tenant→global fallback or make feature flags permission checks. External provider adapters remain optional.

### Wave D — Conditional long-horizon candidates (demand-gated or deferred)

KPR-26–34/36: file-reference integration, webhook signing/SSRF, connector version and secret reference, notification dispatch, metadata validation, stateless lifecycle, timezone, bulk jobs, caches, other-language SDKs. Research only if observed second semantics and budget justify. **Not authorized:** mandatory new library artifact, generic automation/BPM/case/rules/AI, IAM, CMDB, ERP, identity issuer, secrets vault, workflow scheduler, cache platform, search/analytics or shared business storage. Mature solutions should win where they solve the requirement without leaking coupling into Kernel.

## 5. Standards and alternatives watch (comparison, not selected dependency)

| Opportunity | Existing standard or mature alternative | Evaluation guard |
| --- | --- | --- |
| Event envelopes | [CloudEvents v1.0.2 specification](https://github.com/cloudevents/spec/tree/v1.0.2) (working drafts differ) | Optional edge mapping only; preserve Kernel's required tenant/causation/actor and payload semantics, producer source/id uniqueness, version |
| Trace propagation | [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/) | No raw credentials, actor authority or sensitive PII in cross-boundary baggage; don't confuse correlation with trace ID |
| Flag evaluation | [OpenFeature evaluation-context](https://openfeature.dev/specification/sections/evaluation-context/) and [provider spec](https://openfeature.dev/specification/sections/providers/) | Provider-neutral adapter if needed; never translate flags into domain authorization or entitlement |
| HTTP errors | [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) | Optional versioned/negotiated HTTP representation, preserve existing ApiError clients and safe code semantics |
| Call-level retry | [Resilience4j Retry](https://resilience4j.readme.io/docs/retry) | Attempts/backoff/predicate already solved; not DB durability, stale-lease fencing or external cancellation |
| Existing Java/DB implementation | Kernel v0.3.2 core, JDBC and testkit + actual published conformance checks | Retain and harden first, compare lifecycle cost before extraction or new dependency |

External standards availability was reviewed 17 November 2026. No SDK or dependency installed, validated or selected. Standard maturity does not prove suitability to Kernel semantics.

## 6. Falsifiable candidate experiment *proposals* (no execution)

| Proposal | Comparator | Minimum pass/fail discriminant | Decision owner / prerequisite |
| --- | --- | --- | --- |
| EP-01 Portable conformance | Current examples vs proposed comprehensive schema+behavior vectors | Valid+negative shapes, overflow/format/policy cases; actual chosen validator and old/new peers; no unauthorized relaxation | API/QA, separate tool/test authorization |
| EP-02 Safe async context | Explicit app propagation vs pure Kernel helper vs framework-native context | Mismatched scope denied, no cross-request leakage, known identity re-verification and correlation preserved | Security/Architecture, accepted trust model |
| EP-03 Inbox semantics | Existing product-local inbox vs contract-shaped local adapter | Crash-before/after commit, duplicate/conflict, tenantless and expiry/recovery produce correct effect count | Backend/Data/QA, real second comparable use and separate experiment authorization |
| EP-04 Claim fencing | Existing Kernel outbox and local worker policy vs proposed invariant | Stale A completion never mutates B's claim; wrong tenant/token, clock skew, uncertain send and external reconciliation | Reliability/Data/QA, no forced consumer migration |
| EP-05 API ergonomics | Product-local response/query logic vs optional pure helpers | Less adapter complexity with no query leakage, correct cursors/ETags/429 and old-client compatibility | API/Product/QA, actual baseline |
| EP-06 Provider adapters | Native OpenFeature/OTel/Resilience4j vs thin Kernel wrapper | Distinct measurable value vs SDK directly, stable optionality, no core dependency | Architecture/Platform, demand and ownership |

All are **proposals**. Do not execute fault tests, prototypes, migrations, dependency installs or consumer experiments without separate owner authorization.

## 7. Selection and stop rules

A proposed shared capability must present **both** a concrete user/developer benefit and a stable technical invariant: exact source/revision evidence (and two-consumer proof for applicable gates); counterexamples; owner; API compatibility; safe failure cases; product/domain boundaries; no mandatory service; clear migration/rollback; and a full-cost comparison against leaving it local or using mature dependencies.

**Choose RETAIN LOCAL** when commonality is superficial, authority is domain-owned or complexity would merely move. **Choose DOCUMENT/TEST** when the existing library is correct but hard to adopt. **Choose PURE CONTRACT/ADAPTER** when a common guarantee is stable but enforcement must remain local. **Choose OPTIONAL MECHANICS** only after evidence of common failure modes, tested portability and maintainership. **Choose REJECT/DEFER** if shared state, broad runtime or upgrade coupling would exceed value.

Measure approved work with [FAA-05](../integration/operations-and-measurement.md): first conformant endpoint effort, equivalent foundation hours, duplication including adapters/shared maintenance, applicable CC pass ratio, boundary violations, dependency footprint, independent upgrades and net lifecycle cost. All new opportunity-specific ROI/baselines UNKNOWN; no numerical promises.

## 8. Decisions to bring to Product Owner (none pre-approved)

1. Accept/register this **research taxonomy and opportunity map** as a planning reference; merge of its documentation PR is a separate decision after checks/review.
2. If useful, authorize *design-only* W-A1 portable behavior-vector specification and W-A2 async context boundary specification. These can be studied without changing consumers.
3. Continue already documented RD-01/RD-02 research, preserving their earlier work and independent consumer gates. Decide whether a separately scoped experiment is justified by concrete demand, not by this roadmap.
4. Do not start Wave C/D implementations or new Kernel releases on the strength of the register alone.

No implementation, executable tests, consumer mutation, experiment, ADR promotion, PR merge, new library artifact, publication, release or deployment is authorized by KPR-001/KCOM-001.
