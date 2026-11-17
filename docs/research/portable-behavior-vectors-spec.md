# K-RD-V01 — Portable contract and behavioral vector specification

**Status:** PROPOSED DESIGN ONLY; not a new JSON Schema version, wire contract, executable fixture, test result, cross-language certification, runtime change or promotion. Research authorized 17 Nov 2026 (Asia/Jakarta). Reference revision Kernel main `53286741869e1e5354c415faf6cd1c26a3ac41f8`; published v0.3.2 source `c86eb33a46fae2843c75181c6b395cd0dc6710fe`. Source [released v0.2 manifest](../../platform-kernel/src/main/resources/contracts/phase0/v0.2/contract-manifest.json), [existing four positive examples](../../platform-kernel/src/main/resources/contracts/phase0/v0.2/examples.json), [FAA-04 inventory](../contracts/portable-contract-inventory.md), [FAA-03 conformance](../integration/consumer-conformance.md), [KPR](../strategy/kernel-pattern-register.md) KPR-01/02/08/35. Do not modify historical v0.1, released v0.2 manifests/schemas/examples or migrations.

## 1. Precisely separate two validation planes

- **S = structural / schema check** under JSON Schema draft 2020-12, with `$ref` resolved correctly, required vs optional, null vs absent, type, enums, regex, bounds, and `additionalProperties`. For standardized `format`, the default 2020-12 dialect uses *format-annotation*, not an unconditional assertion; a validator's assertion configuration and implementation must be named. [Official specification](https://json-schema.org/draft/2020-12).
- **B = behavioral / trust / safe-use check** under the existing Java API/adapter and canonical standards, after structural validation. A structurally valid bearer-derived ActorContext is *not* proof the issuer, subject, token or tenant membership was authenticated; a valid FileReference is *not* a grant; event delivery is at least once. B must specify the verified credential/policy/transaction, or say **NO SEMANTIC GUARANTEE FROM SCHEMA**.
- **I = interoperability preservation** across old/new reader, producer, language and representation: unchanged required semantics, unknown optional fields ignored unless explicitly prohibited, identity/reference type preserved, integer precision/UTC and canonical wire JSON handled. A changed Java class or app policy can change behavior without a changed JSON Schema.
- **Draft expectation:** `S:PASS`, `S:REJECT` or `S:CONFIGURATION-DEPENDENT`; `B:ALLOW`, `B:DENY`, `B:RECONCILE`, `B:NOT-INFERABLE`. These are proposed *expected results*, not observed test passes. **Do not silently strengthen existing schemas**: put a desired stricter rule in B or flag it for a separately versioned change.

The v0.2 manifest lists eleven schemas (IdentityReference, ActorReference, TenantContext, ActorContext, ResourceReference, CorrelationContext, ApiError, EventEnvelope, AuditEvent, FileReference, ModuleEntitlement) and exactly **four named positive examples**, `ActorContext`, `TenantlessActorContext` (same ActorContext schema), `EventEnvelope` and `ApiError`. No broad negative/precision matrix has been shipped. Scope `v0.1` as immutable historical draft, `v0.2.0` as released wire-contract package, `v0.3.2` as Java artifact version and `event_version` as producer-defined event semantics—never conflate.

## 2. Candidate vector catalog (specification, not executable files)

**Fixture approach:** derive minimal valid instances from released schemas/existing examples; assign synthetic issuer `https://idp.example.com`, safe opaque subjects/IDs, stable clock and test tenant A/B UUIDv7. Do not copy real tokens, customer data or production secrets. For each case, record exact input or derivation, schema and validator versions, expected S/B/I and actual results **only after authorized execution**.

| ID | Contract / layer | Proposed input or mutation | Expected structural result | Proposed behavioral / interoperability oracle |
| --- | --- | --- | --- | --- |
| PV-01 | All 11 | One minimal valid object per manifest schema, resolved local refs | S:PASS | B:NOT-INFERABLE; validates shape only; do not infer authenticated context |
| PV-02 | All 11 | Remove each required key in turn, including required-but-nullable keys | S:REJECT | No implicit defaults on wire; unknown optional field policy unchanged |
| PV-03 | All 11 | Add a previously unknown optional field at top level | S:PASS where `additionalProperties:true` | I: old reader ignores unknown optional property, no authorization semantics |
| PV-04 | IdentityReference | Same subject with two different issuers | S:PASS separately | B: distinct external identity references; never merge on subject alone |
| PV-05 | IdentityReference | Empty issuer or subject | S:REJECT | B:DENY; no trusted identity established |
| PV-06 | ActorReference | Valid `actor_type=service`, opaque `actor_id`, optional identity absent | S:PASS | B:NOT-INFERABLE; actor is not a credential |
| PV-07 | ActorReference | Unknown `actor_type` enum or blank `actor_id` | S:REJECT | Compatibility requires versioned new enum handling |
| PV-08 | ActorContext | Released example and tenantless example | S:PASS | B:NOT-INFERABLE; identity adapter still verifies actual issuer/token |
| PV-09 | ActorContext | Authorization projection missing; alternatively unknown optional provider projection | S:PASS | B:DENY if domain permission absent; unknown keys do not grant access |
| PV-10 | ActorContext | Reuse verified actor for tenant B while active credential binds tenant A | S:PASS if the object is internally shaped | B:DENY; current tenant membership/entitlement/resource authority must be checked |
| PV-11 | TenantContext | `scope=tenant, tenant_id=null` | S:REJECT | B:DENY; no implied tenant |
| PV-12 | TenantContext | `scope=none, tenant_id=null` | S:PASS | B:ALLOW only for separately permitted tenantless endpoint; no tenant data |
| PV-13 | TenantContext | `scope=none, tenant_id=<uuidv7>` or `scope=tenant` missing ID | S:REJECT | B:DENY; IAM DEPLOYMENT is a distinct concept |
| PV-14 | ResourceReference | Opaque non-UUID `resource_id` and valid type | S:PASS | B:NOT-INFERABLE; product must resolve and authorize resource |
| PV-15 | ResourceReference | Tenant A scope with resource owned by tenant B | S:PASS individually | B:DENY; product/Kernel pipeline must fail closed, no cross-tenant data |
| PV-16 | CorrelationContext | Two distinct valid UUIDv7 IDs; optional `causation_id:null` | S:PASS | B:request ID per operation; correlation stable across flow; null causation allowed |
| PV-17 | CorrelationContext | Uppercase UUID, UUIDv4 or wrong variant | S:REJECT via schema regex | B:reject noncanonical IDs at adapter |
| PV-18 | CorrelationContext | Syntactically wrong short `traceparent` without CR/LF | S:PASS if type/length satisfied | B:NOT-INFERABLE; current Kernel helper treats trace as bounded *opaque* text, not W3C parser; later adapter may drop/restart invalid trace by own policy |
| PV-19 | ApiError | Released example and optional `field_errors` absent | S:PASS | B: safe code/message, fresh request ID, correlation retained |
| PV-20 | ApiError | Missing correlation ID, blank code or overlong message | S:REJECT | B: no sensitive failure payload in response |
| PV-21 | EventEnvelope | Released example, `actor:null`, `causation_id:null` but both fields present | S:PASS | B: actorless only if legitimately system-triggered; tenant trust separate |
| PV-22 | EventEnvelope | Remove required `actor` or `causation_id` (even though nullable) | S:REJECT | I: distinguish required-null from absent |
| PV-23 | EventEnvelope | `tenant_id:null` while sender lacks established tenantless authority | S:PASS | B:DENY; schema nullability grants no system privileges |
| PV-24 | EventEnvelope | `event_version:0`, invalid namespaced `event_type`, wrong payload type | S:REJECT | I: changing event meaning needs versioned contract |
| PV-25 | EventEnvelope | Same event ID delivered twice to same receiver | S:PASS for both | B: exactly one committed domain effect *within defined dedup/recovery window*, not exactly-once transport |
| PV-26 | AuditEvent | Valid `outcome=denied`, nullable actor for a legitimate system event | S:PASS | B: authoritative audit remains product-owned; safe evidence not just a log |
| PV-27 | AuditEvent | Invalid outcome or missing required resource/correlation | S:REJECT | B: no successful mutation silently loses required audit intent |
| PV-28 | FileReference | Opaque `file_id`, safe optional snapshot `size`, owner tenant | S:PASS | B:DENY unless actual access/grant checked independently |
| PV-29 | FileReference | `owner_tenant_id:null` or snapshot of inaccessible file | S:PASS | B:DENY until product+File Storage validate grant; snapshot not authority |
| PV-30 | FileReference | `size:-1` or `file_id:""` | S:REJECT | B: do not assume UUID format for external file identifiers |
| PV-31 | ModuleEntitlement | `enabled:true` and module key for tenant A | S:PASS | B:DENY without actor membership and resource permission; entitlement is availability only |
| PV-32 | ModuleEntitlement | `effective_at` in future while enabled | S:PASS | B:DENY until authoritative effective time; injected clock recommended |
| PV-33 | UTC timestamps | String ending `Z` but not a valid RFC3339 date/time, e.g. `not-a-dateZ` | S:CONFIGURATION-DEPENDENT: `pattern: Z$` passes; `format:date-time` may be annotation | B:DENY at semantic date parser; document validator assertion setting; **do not claim existing schema necessarily rejects** |
| PV-34 | Numeric precision | Event `event_version` or FileReference `size` > 2^53-1 while otherwise schema valid | S:PASS (JSON integers do not impose JS safe-integer max) | I: precision-loss hazard for JavaScript; define parser/serialization and product bounds before non-JVM parity claim |
| PV-35 | Time semantics | Valid UTC `Z` vs timezone offset `+07:00` on fields constrained to `Z$` | S:PASS for valid `Z`, S:REJECT for offset under current pattern | B: preserve instant across conversion, never silently localize wire UTC |
| PV-36 | Compatibility | Old reader receives additive unknown optional property | S:PASS where allowed | I: ignore field and retain previously accepted meaning; report incompatible reader separately |
| PV-37 | Compatibility | New reader sees older producer missing newly proposed optional field | S:PASS using existing v0.2 required set | I: explicit default/absence semantics; no widening authority |
| PV-38 | Compatibility | Remove required key, change enum meaning, narrow type or reuse ID with new semantics | S may reject or still pass depending change | I: breaking even if shape unchanged; requires versioning/migration, not additive release |
| PV-39 | Schema/ref integrity | Load all 11 `$ref` targets and manifest entries with exact retained `$id` and dialect | S:PASS if complete | I: no external network fallback/foreign schema injection during validation |
| PV-40 | Wire vs Java | Deserialize valid opaque references and two-issuer actor; compare normalized Java records | S:PASS | I: Java, JSON and optional consumer language preserve exact issuer/subject/scope/IDs; prove actual library behavior, not guessed constructor parity |

## 3. Deliberate source discrepancies and current gaps

1. **S/B distinction:** the schema allows many shapes that must be denied by application trust checks (PV-09/10/12/15/23/28/29/31). Do not 'fix' security by tightening wire JSON without a compatibility decision.
2. **Date-time annotation:** `format:date-time` is not universally an assertion in the official 2020-12 dialect. `pattern:Z$` constrains suffix, not RFC3339 validity; executor must name validator and semantic parser.
3. **Observability trace:** `traceparent`/ `tracestate` fields are bounded optional strings in current wire. `CorrelationPropagation` checks length and CR/LF but does not validate full W3C syntax; do not mark a W3C conformance pass from the current code.
4. **Large integers:** current v0.2 schemas do not impose an ECMA-262 safe integer bound. Cross-language lossless JSON number parsing is a future comparison question, not an approved new constraint.
5. **Syntactic vs semantic compatibility:** a loosened schema or additive field can still change trust meaning or domain logic. Compare both producer/reader directions, payload semantics and event_version rather than only schema diffs.
6. **Synthetic examples:** existing four entries are positive samples. PV-01–40 are **design-only proposed cases** and **zero have been executed** by this document. Testkit fake identity is not a production verifier.

## 4. Proposed executor inputs, output record and stop gates

An eventual separately authorized executor should pin: (a) exact Kernel artifact and `manifest/version` and individual schema digests; (b) schema/validator implementation and exact dialect/`format` assertion setting; (c) Java21/25 or other selected runtime; (d) JSON parser precision mode and date parser; (e) actual consumer and test checkout where business checks are needed; (f) independent QA/Security reviewers. Each vector record: ID, input derivation/immutable data, S result, B result (or N/A), I pair/version, observed vs expected, execution revision, failure reason, sample count and owner. No behavioral PASS from schema only.

**Exit for this design package:** all 11 manifest entries mapped, all proposed vectors have a falsifiable expected outcome and a validation plane, incompatible policy is marked as a **future decision**, and integration with FAA-03 CC-01–04/05–13/19/21/23/26/27 is traceable. **Before executable fixtures/tests:** owner approval of exact vector payloads, runtime/tooling, maintenance, CI cost and non-breaking compatibility profile. Any new schema/version, public enum, SDK or migration needs separate approval; do not overwrite released v0.2 or promote a v0.3 artifact.

## 5. Routing

Primary API & Integration Engineering (wire semantics and bidirectional compatibility), QA/Test (fixture design and runner selection), Security (negative trust cases), Architecture (domain boundaries), Release (artifact/old consumer compatibility). Keep work in Kernel and do not modify consumer repositories. Compare mature [JSON Schema 2020-12](https://json-schema.org/draft/2020-12), [RFC 3339 via chosen date parser](https://www.rfc-editor.org/rfc/rfc3339) and existing Java helpers; do not introduce a schema validator dependency to core automatically. Next action is **review of this specification**, not execution.
