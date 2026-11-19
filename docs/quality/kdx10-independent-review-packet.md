# KDX-10 independent review and release acceptance packet — issue #54

**Evidence checkpoint:** 19 November 2026. **Status:** reviewer handoff, **NOT** independent approval or release authorization. Published library remains **v0.3.2**. Draft [v0.4.0 candidate #65](https://github.com/vyrnforge/platform-kernel/pull/65) remains unmerged/unpublished. Keep [#54](https://github.com/vyrnforge/platform-kernel/issues/54) open until its independent acceptance gate is explicitly disposed.

## What is already complete

The nine KDX source-change PRs [#55–#63](https://github.com/vyrnforge/platform-kernel/issues/54) were owner-approved and merged in order under DEC-K031 / CHG-K032. No additional runtime change is proposed by this packet.

| Workstream | Current code status | Independent reviewer must verify |
| --- | --- | --- |
| KDX-01 — idempotency input limits | Merged #55 | Canonical v0.2/v0.3 wire fields, released JDBC V1 column lengths, input rejection and change impact |
| KDX-02 — atomic JDBC composition | Merged #58 | Domain SQL and required audit/event intents share one product-owned transaction; replay/rollback/caller misuse remain fail-closed |
| KDX-03 — module-key grammar | Merged #56 | Reject invalid grammar consistently without surprising prior valid consumers |
| KDX-04 — Flyway coexistence | Merged #60 | Migration V1–V3 unchanged; host app owns its Flyway history and migration deployment |
| KDX-05 — tenantless factory | Merged #57 | Explicit tenantless policy, no tenant-owned access or untrusted token normalization |
| KDX-06 — JSON codec | Merged #59 | Optional Jackson codec stable for documented fields; published serializers/consumers remain compatible |
| KDX-07 — HTTP reference recipe | Merged #63 | Framework-neutral headers/error/correlation rules; duplicate-case headers cannot bypass checks |
| KDX-08 — health probes | Merged #61 | Timeouts and failed/null probe handling owned by app; no hidden scheduler or health success assertion |
| KDX-09 — contributor hygiene | Merged #62 | Style guardrails stay narrow; no generated-code or multiline rewrite churn |

**Integrated technical baseline:** [verification PR #64](https://github.com/vyrnforge/platform-kernel/pull/64) at `6b1b5421cc4d0d348379b512cdd55d7d3bfa0c3b` passed [CI #44016793669](https://github.com/vyrnforge/platform-kernel/actions/runs/44016793669), [CodeQL #44016793751](https://github.com/vyrnforge/platform-kernel/actions/runs/44016793751), and [dependency review #44016793651](https://github.com/vyrnforge/platform-kernel/actions/runs/44016793651). Protected-main KDX content reconciliation and approved squash merges are recorded under CHG-K032. This supports the **merged source tree at that checkpoint**, not a new v0.4.0 artifact, release signing, or any later consumer production state.

## Most recent real-consumer evidence and its boundary

- [Current File Storage draft #117](https://github.com/vyrnforge/file-storage/pull/117) was tested against Storage base `a1903778af1e272ae15c025fe28c4cca369c09af` through GitHub's synthetic merge `dc575590f989591774ae18f40c4599e3c3556721`. [K-CON-06 #44429272723](https://github.com/vyrnforge/file-storage/actions/runs/44429272723) and [ordinary CI #44429269535](https://github.com/vyrnforge/file-storage/actions/runs/44429269535) **passed**, including 58 PostgreSQL JDBC tests and 105 runtime tests. Exact Maven Central v0.3.2 **core and optional JDBC** JAR SHA-256 checks both matched. This tests the **published v0.3.2 artifacts**, **not** KDX's unreleased v0.4.0 candidate or real IAM-production handoffs.
- IAM [#547](https://github.com/wyrmgate/iam/pull/547) and [#548](https://github.com/wyrmgate/iam/pull/548) passed their technical checks in previous reviews, but had no submitted independent approval on 19 November. Do **not** infer IAM deployment, G3 acceptance, product security sign-off or v0.4.0 compatibility.
- Independent Asset first-consumer acceptance is not established in these results. [Kernel #41](https://github.com/vyrnforge/platform-kernel/issues/41) owns cross-product conformance.

## Missing sign-off — exact review work, not boxes for the author to self-check

| Review authority | Evidence to attach | State |
| --- | --- | --- |
| API/compatibility reviewer | Review additive factory and codec signatures, module grammar, invalid-input/HTTP/JSON behavior against published v0.3.2 and intended v0.4.0; record accepted break/compatibility window | **OPEN — reviewer not recorded here** |
| Security/tenancy reviewer | Challenge unverified/tenantless identity, same-tenant/nonmember access, cross-tenant 404 and audit redaction, including reject-by-default paths | **OPEN — reviewer not recorded here** |
| Database/reliability reviewer | Review caller-transaction boundaries, replay/concurrent retries, rollback, migration coexistence, pending/DEAD outbox recovery and restoration | **OPEN — reviewer not recorded here** |
| Consumer owners / QA | Test candidate against current IAM/Storage/Asset using approved fixtures and precise version/digest; record observed negatives and roll-forward/back | **OPEN — released v0.3.2 consumer test is insufficient** |
| Release owner | Confirm exact-artifact verification, no tag/Central collision, signer custody/rollback and explicit approval before candidate merge/publication | **OPEN — separate decision required** |

**Review record template (one per reviewer):**

`Role | reviewer | date | exact candidate SHA + artifact digest | scenario IDs and commands | observed PASS/FAIL | first failure + logs | compatibility/security concerns | disposition ACCEPT / BLOCK / DEFER | approved change-log reference`

A review of the documentation alone must not mark a candidate runtime contract accepted. Where the original single-maintainer exception is invoked, record its precise scope and compensating evidence; it is **not** a general substitute for cross-product owners. No credential, secret or signing key values belong in this packet.

## Explicit next gate / disposition

1. Qualified API + Security + DB review, with scoped exception/disposition only if permitted by project decisions.
2. Fresh candidate-version build / isolated consumer compatibility and **current** product-specific negative tests against the intended v0.4.0 artifact, not v0.3.2.
3. Product/Release owner records explicit compatibility, rollback and signing decision in the canonical Drive Decision & Change Log before **any** release.
4. Only then reassess KDX-10 under #54. Until then the status is **source-complete / acceptance-open**.

**Scope:** evidence and reviewer handoff only; does not alter Java source, migrations, testkit, IAM, File Storage, Asset, ITSM, published tags or publication workflow.
