# UX issue #80 — durable mutation and consumer evidence journey

**Status:** Source-aligned website documentation and automated review only. This is **not real PostgreSQL, IAM, outbox, screen-reader or consumer conformance acceptance**.

**Baselines:** protected main at `d4b8cbb68a7d5c1bc3b7d327f7976bf4cee771cb`; published v0.3.2 source at `c86eb33a46fae2843c75181c6b395cd0dc6710fe`; canonical Constitution, Architecture, API/Events, Security/NFR and Decision & Change Log. v0.4.0 PR #65 remains draft/unreleased.

## Shortest product-user journeys

| ID | Entry / action | Observable result | Recovery / next step | Evidence kind |
| --- | --- | --- | --- | --- |
| D01 | Docs → JDBC: no durable write required | Developer sees core-only choice and no required database/server | Use published core guide | Source / browser regression |
| D02 | JDBC → first ACQUIRED | Only an authorized ACQUIRED decision permits product SQL + required audit/event intents + replay result, on the same Connection | Confirm app's actual SQL transaction; no inline network call or manual commit | Source / simulated; real consumer pending |
| D03 | JDBC → REPLAY | Fresh authorization before begin, stored safe result, no second SQL or new intents | Examine existing outbox separately; deny revoked caller | Source / simulated; real consumer pending |
| D04 | JDBC → IN_PROGRESS | No new lease/write; not equivalent to REPLAY | Application-defined retry guidance, bounded backoff, stale lease reconciliation | Source / simulated; real consumer pending |
| D05 | JDBC → CONFLICT | No new SQL; reused key with different fingerprint | Application owns HTTP mapping (409 illustrative only), reject key reuse | Source / simulated; real consumer pending |
| D06 | Rollback or lost response | Never infer a committed write from network failure | Inspect authoritative DB, idempotency state and intents before abort or retry | Manual PostgreSQL fault injection pending |
| D07 | Outbox duplicate/lost claim/DEAD | At-least-once behavior and claim fencing acknowledged; DEAD could already have delivered | Receiver deduplication and evidence-led operator reconciliation before re-drive | Manual transport/recovery pending |
| D08 | Missing required event/audit intent | All-or-none product SQL and required intents | Actual append-only/permissions and rollback checks, CC-17/21 | Manual PostgreSQL pending |
| D09 | Migration/restore | Product owns Flyway V1–V3, writer drain, backup/restore and rollback plan | Verify CC-22/27 on actual product schema and runbooks | Manual operations pending |
| D10 | JDBC → testkit/conformance → JDBC | Conformance IDs visible, testkit restricted to test scope, direct on-site return link | Record actual product evidence, or not applicable with justification | Source / browser regression; human AT pending |

## Contract distinctions to verify

- `IdempotencyDecisionType` in published v0.3.2: `ACQUIRED`, `REPLAY`, `IN_PROGRESS`, `CONFLICT`. The JDBC adapter does not automatically choose product HTTP response codes.
- `JdbcReliabilityTransaction.executeIdempotent` commits application domain data, required audit/event intents and result on the supplied JDBC `Connection`. Do not use a second connection, `connection.commit()`, independent `execute + complete`, or remote calls inside the callback.
- Only an authorized, currently permitted caller may receive a stored replay result; never replay expiring access credentials, signed URLs or sensitive payloads.
- The outbox is at-least-once; stale claim token fencing prevents a late worker from updating ownership, but cannot prevent a transport duplicate already delivered.
- `platform-kernel-testkit` is **test-scope only**; it supplies deterministic fixtures but no real application evidence.
- Reference conformance scenarios `CC-14`–`CC-22`, `CC-27` are source-published matrix entries and **not run** merely because they appear on the site.

## Automated verification and manual acceptance

1. Exact PR-head Node docs-data/workbench tests: decision IDs, replay/in-progress/conflict no-write behavior, source wording, searchable recovery/conformance, testkit scope and v0.3.2 pin.
2. Existing esbuild and headless Chromium production bundle: four outcomes, disclosure keyboard, deep link → one simulated Playground → on-site JDBC and Assurance → return, internal link behavior and 320–2560px no-overflow smoke.
3. Existing change-scoped `ci`, CodeQL, dependency-review; avoid unrelated Java/PostgreSQL/release staging for site-only changes.
4. **Manual pending:** real JDK21 consumer and PostgreSQL product SQL; concurrent retry + crash/rollback/lost response; actual outbox receiver duplicate/DEAD and operator restore; product Flyway V1–V3 upgrade/rollback; NVDA+Chrome, VoiceOver+Safari, real 200%/400% zoom; at least one unfamiliar Java integrator task session.

**Record** `task ID | source revision | browser/OS/AT | viewport/zoom | selected artifact(s) | product commit/DB revision | preconditions | expected state | actual first failure | remediation | responsible owner | retest evidence`.

**Approval boundary:** UX/Frontend/QA website evidence does not close [issue #41](https://github.com/vyrnforge/platform-kernel/issues/41) or issue #80's manual acceptance. No runtime API, schema, migration, release, IAM, File Storage or product authority change is authorized. Owner approval is required before merging or deploying the PR.
