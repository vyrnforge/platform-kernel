# APP-A0 — Asset Management Kernel adoption discovery handoff

**Status:** OPEN — product discovery only; implementation BLOCKED on confirmed Asset repository, accountable product owner, accepted business slice and comparator. Prepared 17 November 2026 (Asia/Jakarta) under Product Owner authorization to open Asset APP-A0 in parallel with Kernel K-CON-02. This document is a handoff, not an Asset-domain approval, feature specification, accepted business decision or release plan.

**Source of authority:** [Kernel Constitution v0.4](https://docs.google.com/document/d/1rWt_7--1nTIrBdkiQkoHEb_-GNdYPhr6m4ZUA8VtHoA/edit), [Product Scope & Capability Map v0.4](https://docs.google.com/document/d/1alABmlmUz53QT7lWBUyJASNkrEIpjUcb417SshZxiew/edit), [Architecture & Boundaries v0.3](https://docs.google.com/document/d/1esvwqcLVpKV2-3j37OjnvlUoUa1w8jmvj7S6Lawtlss/edit), [Decision Log v0.6](https://docs.google.com/document/d/1Z01AcARfMyE0aIbQZADP8xf_dA0U7Pfg95IJHmKwrhM/edit), and the [next-increment dossier](next-increment-research-and-adoption.md). Kernel main at handoff: `7cdc1168b52974723cdb9ef31dd36ae57277de6f`; published `v0.3.2` remains unchanged.

## 1. Confirmed product boundaries

Asset owns the authoritative registry, type/category/model, lifecycle, assignment and custody, location, supplier/warranty, purchase/cost, maintenance, disposal, asset audit, import/export and business APIs/events. Those are not Kernel domain capabilities. External IAM or supported IdP owns verified authentication and the authoritative identity source; product owns resource authorization. File Storage owns file bytes and grants; Asset may hold only stable references. ITSM may reference Asset IDs without direct Asset database joins. Products may be bought/deployed independently, including Asset with an external IdP and without the native IAM service. Kernel supplies optionally adopted technical primitives and **no mandatory shared server or domain database**.

The internal Kernel `consumer-tests/asset-reference` and [synthetic Asset reference](../consumer/asset-reference-http.md) demonstrate limited adapter behavior only; they are neither an Asset Management application nor an adopted production vertical slice.

## 2. APP-A0 discovery register — do not invent missing inputs

| ID | Input / decision required | Observed or proposed | Accountable decision owner | Evidence needed to close |
| --- | --- | --- | --- | --- |
| APP-A0-01 | Asset project repository and current base revision | **MISSING**. No confirmed matching Asset Management repository or product-specific project constitution was located in the accessible GitHub/Drive discovery; this does not prove none exists. | Asset Product Owner / repository owner | Repository URL, default branch and exact commit, governing product documents, permissions to review |
| APP-A0-02 | Named business owner and acceptance authority | **MISSING**; Kernel Technical Delivery Lead is a handoff coordinator, not Asset business owner | Asset Product Owner | Owner and reviewer assignment, scope/decision authority |
| APP-A0-03 | First business outcome and bounded initial state | **PROPOSED:** tenant-authorized asset registration and retrieval; candidate `POST /v1/assets` and `GET /v1/assets/{id}` only | Asset Product + Business Analysis | Approved required fields/type/category, uniqueness, initial lifecycle state, permitted actions, business error semantics; no fabricated domain policy |
| APP-A0-04 | Trust, tenancy and entitlement | **REQUIRED BOUNDARY:** verify actual issuer+subject, active tenant/member, entitlement and Asset resource authorization before mutation/replay; deployment and tenantless are different | Security/IAM and Asset Security owner | Provider choice, trust/membership freshness, permission matrix, negative scope/revocation cases |
| APP-A0-05 | Technology and persistence choice | **OPEN:** Java 21+ is compatible with published Kernel; core-first. JDBC optional only with product-owned PostgreSQL transaction; do not force a data store or shared outbox | Asset Architecture/Data/Backend | Runtime, target database, mutation boundary, transaction and recovery responsibilities |
| APP-A0-06 | Audit/event intent and integration semantics | **OPEN:** product determines which mutation requires authoritative audit and/or versioned event, event type/payload and consumer | Asset API/Backend + Security | Approved audit/action model, event versions, receiver/retry policy and ownership; no unapproved new broker |
| APP-A0-07 | File/attachment requirements | **NOT ASSUMED** in the first slice; FileReference is not access permission | Asset Product + Storage owner | Include only if real first-slice need; define local grant and lifecycle, not raw bytes |
| APP-A0-08 | Operational profile | **MISSING:** environment, critical journey, user load, SLO/RPO/RTO and restore ownership | Asset Operations/Reliability | Applicable FAA-05 O-01–08, product targets and admission policy |
| APP-A0-09 | Comparable effort and lifecycle baseline | **MISSING:** no first endpoint, comparator, engineer-hours, accepted adoption or ROI measured | Product/BA + Finance/consumer owner | Equivalent requirements, credible standalone comparator or separately approved bounded baseline; common units/time window and shared-cost allocation |

No domain implementation or experiment may start merely because these entries exist. The first slice is a proposal; the Asset Product Owner may change it before design approval. IAM #547/#548 and Kernel #41 are separate acceptance processes; no forced wait for IAM G3 migration or Kernel RD research.

## 3. Proposed first vertical slice — only after APP-A0 acceptance

1. Resolve a real trusted credential using supported external IAM/IdP; map verified issuer+subject to stable actor reference. Fail closed for wrong issuer, tenant, audience, expired/revoked credential and forged projection; no raw credential details in errors/logs.
2. Resolve active tenant and authoritative membership, effective entitlement and Asset permission; scope all Asset reads/writes. No tenantless bypass and no direct joins to another domain's DB.
3. Register one domain-authorized asset with approved minimum data and initial status; generate stable new Asset-owned ID, preserve request/correlation, map errors safely. Keep business validation inside Asset.
4. If registered as retriable, compute effective tenant/operation/key/fingerprint and authenticate/authorize again on replay. Mutate asset and required audit/event intents plus result on one product-owned transaction; select local mechanism or Kernel JDBC `begin` → `executeIdempotent` only if compatible. Do not perform external network side effects inside that transaction. A separate `execute` + `complete` composition is not crash-atomic.
5. Verify authorized retrieval, cross-tenant denial and safe response serialization. After commit, perform selected event delivery with at-least-once-compatible dedup, or explicitly document N/A when no event is required.
6. Measure the time to the **first actually conformant endpoint**, not the first compiling controller; admission remains product-owned.

No executable API, schema, migration, domain fields, role names, event names, implementation or consumer modification has been created by APP-A0.

## 4. Verification and measurement handoff

Use [FAA-02](../integration/quickstart.md), [FAA-03](../integration/consumer-conformance.md), [FAA-04](../contracts/portable-contract-inventory.md), [FAA-05](../integration/operations-and-measurement.md). **Proposed** mandatory CC items for the proposed create/read path: 01–06, 09–11, 13–18, 21, 24 and 26. CC-07 if multiple issuers; CC-19/20/22/25/27 only as applicable to selected events, stateful operation, deployment and upgrade; CC-08 tenantless, CC-12 FileReference, CC-23 cross-consumer not automatically part of the first slice. Product QA must individually review applicability and justify N/A. Negative tenant, forged trust, replay conflict/current authorization, rollback and denied resources cannot be omitted when applicable.

Before Asset development, Product/BA establishes the FAA-05 record: same technical foundation requirements for proposed Kernel and comparator, source/revision, measurement period, engineer-hours and calendar duration separately, setup/config/adapter/testing/debugging/maintenance, retained local and allocated shared lifecycle cost, dependencies, conformance count, confirmed boundary violations and actual product-owner acceptance. Compare like-for-like. No business values or performance targets are claimed; 2 engineering days, 30% effort reduction and 25% duplication reduction remain unapproved hypotheses.

## 5. Exit gate and next separate approvals

**APP-A0 completion requires:** (a) verified Asset repository/main revision and product instructions, (b) named accountable owner, (c) approved business slice and explicit authorization/tenant policy, (d) persistence and audit/event boundary decisions, (e) applicable conformance plan, (f) measurement comparator/window, and (g) distinct product authorization for APP-A1 design and later implementation. Current status: **OPEN / BLOCKED for real Asset work** on (a)–(f).

The Kernel-only documentation handoff can be reviewed now. Route to the owning Asset project when identified; do not open a duplicate product backlog under Kernel or assert Asset domain acceptance. No code, experiment execution, consumer changes, ADR promotion, PR merge, publication, release or deployment is authorized.
