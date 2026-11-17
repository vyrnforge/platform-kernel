# K-RD-R12 — RD-01 / RD-02 contract invariants and failure-timeline refinement

**Status:** DESIGN PROPOSAL ONLY, 17 Nov 2026. This is a Kernel-only cross-pattern refinement of existing [RD-01/RD-02 research in draft PR #47](https://github.com/vyrnforge/platform-kernel/pull/47) and [Pattern Register](../strategy/kernel-pattern-register.md) KPR-13–19. Draft #47 remains separate and **not merged**. Nothing in this document accepts a new `InboxPort`, lease API, SQL schema, event version, task runtime, consumer migration or experiment. Reference Kernel main `53286741869e1e5354c415faf6cd1c26a3ac41f8`; published v0.3.2 unchanged. Approved DEC-K020–029, [existing reliability semantics](../contracts/reliability-semantics.md), [FAA-03](../integration/consumer-conformance.md) and [IAM ADR-0085](https://github.com/wyrmgate/iam/blob/1dc55509868c89ebb6fd6016c3659d0ae5a0d302/docs/adr/0085-platform-kernel-adoption-boundary.md) govern. Consumer implementations are comparison evidence only, **not** work requested in their repositories.

## 1. Fundamental distinctions

| Concept | Meaning | Existing foundation | What it must not be |
| --- | --- | --- | --- |
| API mutation idempotency | Repeated caller operation at `tenant_id + operation + key` with effective fingerprint | `IdempotencyPort`, optional `JdbcReliabilityTransaction.executeIdempotent` | Inbound event inbox, infinite retention, permission grant |
| Event inbox / receipt | Consumer-specific deduplication of *received* event | No Kernel inbox API; RD-01 only | Guaranteed completed effect merely because receipt row exists |
| Producer intent / outbox | Durable promise to eventually deliver event, at least once | `EventIntentPort`, optional `JdbcOutboxPublisher` | Broker acknowledgement or exactly-once remote effect |
| Lease | Temporary attempt ownership until expiry | Optional JDBC publisher claim-token + expiry | A remote process cancellation mechanism |
| Fencing | Guard authoritative state transition by current claim identity | Current JDBC publisher `claim_token`, `locked_until>now`, `PENDING` | Protection for an external provider that cannot check same token |
| Deadline | Upper bound on operation lifetime | Not a general shipped Kernel task contract | Identical to lease expiry or attempt timeout |
| Retry policy | Decide eligibility, budget, delay and outcome classification | Current JDBC outbox fixed delay and max attempts | Generic scheduler, business workflow or provider outcome oracle |

The [current JDBC publisher](../../kernel-persistence-jdbc/src/main/java/io/vyrnforge/platform/kernel/persistence/jdbc/JdbcOutboxPublisher.java) locks candidate rows for claim, assigns an opaque UUIDv7 token and lease expiry, checks `stillOwned` before transport, and conditionally updates by event ID + current token + PENDING + unexpired claim after transport. It terminates exhausted pending claims as DEAD; a send that succeeded before a failed local update remains uncertain, not provably undelivered. This is **released behavior**, not a new universal reliability contract for other mechanisms. Because time passes between pre-send check and actual send, the method does not fence effects at an external service; no claims of remote exactly-once.

## 2. RD-01 proposed receipt semantics — **two different acceptable transaction designs**

**Candidate identity (not new schema):** `consumer_namespace + authoritative_scope + event_id`, optionally bound to `producer + event_type + event_version + canonical_content_digest`. Identity scope is a tagged value (TENANT with UUIDv7, or explicitly approved TENANTLESS partition); SQL `NULL` alone is unsafe as a uniqueness key because PostgreSQL defaults to distinct-null behavior. A future implementation would need explicit partition/discriminator (or a tested `NULLS NOT DISTINCT`/equivalent) with precise migration/compatibility review. Raw `actor` or arbitrary claimed tenant is not proof of authority.

**Design A — single owning transaction (preferred where possible):**
```text
verify transport/source + scope + supported event version
BEGIN product-owned transaction
  INSERT/LOCK dedupe identity and compare effective content fingerprint
  if same COMPLETED receipt: no new effect; mark durable duplicate outcome
  else mutate domain + required audit/event intents + COMPLETED receipt atomically
COMMIT
ack delivery only after committed effect; if commit unknown, reconcile/duplicate retry
```
Business mutation and receipt must be on the **same authoritative connection/transaction** when claiming this atomic guarantee. If callback/network side effect is needed, record an idempotent intent for later delivery; never call the provider inside this transaction.

**Design B — separately committed receipt and work (allowed only if recovery is explicit):**
```text
verify source/scope
persist RECEIVED or claimable state with ownership/expiry
durable worker claims current receipt
commit domain effect+required intents+receipt COMPLETED atomically when feasible
ack only when known durable COMPLETED (or after durable handoff per explicitly accepted broker contract)
on crash/restart: recover stale RECEIVED/IN_PROGRESS; never interpret key existence as success
```
This design has additional recovery and liveness complexity; an inbox keyed only on received event cannot safely suppress duplicates if first receiver died before its effect. Claims/leases and terminal poison states are not automatically justified as new Kernel abstractions. Retention must cover the agreed delivery/replay/restore horizon; purged receipts can legitimately permit re-execution, so guarantees are **bounded**.

**Proposed receipt outcome vocabulary for analysis only:** `NEW`, `IN_PROGRESS`, `COMPLETED_SAME_CONTENT`, `CONFLICT_DIFFERENT_CONTENT`, `RETRYABLE_FAILURE`, `QUARANTINED`. This is a reasoning taxonomy, **not** a new enum, Java record, database state, event schema or stable public contract.

## 3. RD-02 ownership, retries and deadlines — proposed invariants

**Attempt state tuple (proposed mathematical model only):**
```text
(work scope, work ID, claim token or epoch, attempts used, max attempts,
 next eligible instant, lease deadline, overall operation deadline, outcome class)
```
Scope and work ID are product-owned authoritative identifiers; the claim token/epoch changes on **every acquisition**, including the same worker reacquiring. Effective expiry boundary: a claim is current only if `now < lease_deadline` (at equality, expired). A state transition succeeds only if work identity, scope, current token/epoch, expected status, and unexpired claim all match *atomically*. A stale owner cannot complete, renew, fail or reschedule an item claimed by B.

**Separate clocks:** `nextEligibleAt` gates starting attempt; `leaseDeadline` guards ownership; `attemptTimeout` bounds one attempt; `operationDeadline` bounds whole business operation; `maxAttempts` gates exhaustion. They are not aliases. Proposed use of injected clock for deterministic test cases and explicit database timestamp precision; monotonic elapsed-time measurement is preferable for local duration metrics but does not replace persisted absolute lease deadlines in cross-process recovery. Clock skew/precision tolerance needs design review and no unbounded extension.

**Failure classification (product-defined):** `RETRYABLE` when an attempt may safely repeat under effective idempotency; `PERMANENT` when no further attempt should run under current config/policy; `UNCERTAIN_EXTERNAL_EFFECT` when send succeeded or timed out but remote outcome is unknown and must reconcile before unsafe re-send; `LOST_CLAIM` when local update is rejected because ownership changed; `EXHAUSTED` after budget/deadline. These are conceptual categories, not new API or persisted statuses. In the **existing Kernel outbox**, fixed `retryDelay` and DEAD/ PENDING behavior must not be misdescribed as arbitrary exponential backoff, cancellation or workflow state machine.

**External side-effect rule:** lease and DB compare-and-set fence **local record mutation**. External HTTP/object storage/email services might finish work after timeout or lease loss. Require provider-supported idempotency token, operation-specific reconciliation or explicit accepted at-least-once semantics; cancelling a Future does not prove cancellation remotely. `DEAD` never proves non-delivery.

## 4. Discriminating failure timelines (not executed)

| ID | Ordered fault timeline | Minimum acceptable outcome / oracle |
| --- | --- | --- |
| R12-01 | Event E arrives at two workers concurrently, same consumer+tenant+event+content | One committed effect; subsequent completed delivery no effect |
| R12-02 | Same event ID and scope with different content/version/producer | Safe conflict/quarantine; no acceptance as duplicate success |
| R12-03 | Tenant A and B use same event ID | Both isolation keys distinct, no cross-tenant effect or receipt existence leak |
| R12-04 | Explicit tenantless event same ID received twice | Same tenantless partition deduped, no implicit deployment authority; NULL uniqueness proven |
| R12-05 | Insert RECEIVED commits; worker crashes before domain mutation | Recovery processes effect; duplicate arrival not falsely acknowledged completed |
| R12-06 | Domain effect+receipt commit; broker ack lost | Redelivery acknowledged as already complete, effect not repeated |
| R12-07 | DB rollback before effect/receipt commit | No durable partial side effect; redelivery retried |
| R12-08 | Effect committed; external call uncertain; retry arrives | Reconcile via durable intent/provider key; do not assume no delivery |
| R12-09 | Receipt retention expires and old delivery reappears | Defined bounded dedup policy; reconcile before potentially unsafe replay |
| R12-10 | Worker A claims at T0; expires at T1; B reclaims at T2; A completes T3 | A update rejected by current claim CAS; B remains authoritative |
| R12-11 | Worker A reacquires same work after expiry; original A attempt finishes late | Old token/epoch denied even if same worker identity |
| R12-12 | Worker completes at exactly lease deadline | Expired; do not accept stale completion |
| R12-13 | Worker A attempts to renew with wrong tenant/work/token | Deny without leaking another tenant's existence |
| R12-14 | Claim attempts used == max, lease expired | Terminal exhaustion without an extra transport attempt; reconcile prior uncertain sends |
| R12-15 | Attempt timed out before whole operation deadline | Retry only if current policy/budget allows; remote may still execute |
| R12-16 | Overall deadline reached while attempts remain | No new attempt; outcome explicit and recoverable |
| R12-17 | External send succeeds, local update fails | Ambiguous delivery retained for reconciliation; never promise exactly once |
| R12-18 | Final permanent failure vs transient failure | Product-specific terminal/retry policy, safe error code and telemetry; no raw secrets |
| R12-19 | Backup restore loses recent receipt but external action occurred | RPO/recovery gap explicit, re-drive reconciled, not silent duplicate |
| R12-20 | Clock skew, DB microsecond precision vs JVM instant or timezone shift | Documented consistent compare; no premature ownership transfer or infinite extension |
| R12-21 | Poison event repeatedly invalid/unauthorized | Bounded rejection/quarantine, safe evidence, no unbounded retries |
| R12-22 | Two different consumers process same event | Independent consumer namespace; each may apply one local effect |
| R12-23 | Old/new consumer versions share event_version with changed semantics | Compatibility HOLD, version/adapter needed, no silent reuse |
| R12-24 | Attempt result contains expiring URL/credential and caller retries | Reauthenticate/reauthorize, never replay expired grant/secret |
| R12-25 | Graceful shutdown after claim before send | Drain or expire appropriately; no writer overlap or lost durable intent |

**Evidence mapping:** R12-01–09/21–24 refine proposed RD1-AC01–05, FAA-03 CC-19 and relevant CC-05/09/21/22/23. R12-10–20/25 refine RD2-AC01–05, CC-17/18/20/22/25/27. **No R12 case is marked executed or PASS**; no new consumer test has been run. The existing Kernel Java21/JDBC technical tests and separately pinned consumer evidence in #41 remain unchanged.

## 5. Evaluating options without rebuilding mature tools

| Need | Retain local | Mature option to examine | What *could* belong in Kernel later |
| --- | --- | --- | --- |
| Consumer dedup | Product-local unique receipt + own tx | [Spring Integration idempotent receiver](https://docs.spring.io/spring-integration/reference/handler-advice/idempotent-receiver.html) + durable metadata store | A small provider-neutral receipt contract, not broker/worker runtime |
| Per-call bounded retries | Product adapter | [Resilience4j Retry](https://resilience4j.readme.io/docs/retry) and [TimeLimiter](https://resilience4j.readme.io/docs/timeout) | Only shared policy vocabulary if real value beyond mature tools |
| Durable outbox | Existing `JdbcOutboxPublisher` where suitable | Product-owned queues/brokers | Harden existing optional JDBC; no duplicate authoritative publisher |
| Expiry/fencing | Product-owned CAS keyed current token/epoch | DB native locking, provider idempotency/reconciliation | Portable claim-fencing invariant plus **optional** mechanics with evidence |
| Technical jobs | Product-owned operation ledger | Mature scheduler/workflow library if justified | RD-03 *after* actual RD-01/02 demand; no generic runtime now |

**Promotion proof required:** at least two *independent real consumers with equivalent invariants* for the relevant lifecycle/reliability extraction; one named maintainer, source/checkout and current releases; comparable fault timeline; implementation, adapter, migration, security/QA, operation and maintenance costs; no mandatory service or dependency in core; old/new compatibility and rollback. IAM E1b/K2 transaction-equivalence before any optional-JDBC replacement remains separately gated by ADR-0085. Synthetic fixtures alone do not qualify.

## 6. Scope boundaries and owner review requests

- **API/Integration:** Decide stable semantics for event identity/version/fingerprint/namespace; do not confuse event receipt with tenant-scoped API idempotency.
- **Backend/Data:** Audit claim CAS, transaction ownership, recovery and precision; retain existing storage until equivalence; no migration plan execution.
- **Security:** Verify producer/tenantless authority, safe retention, content mismatch, credential replay and logging; no arbitrary token/actor projection trust.
- **QA/Reliability:** Turn R12 timelines into *separately authorized* test design only after naming real fixture versions, checkouts and expected outcomes.
- **Architecture/Product Owner:** Confirm which problem has second-consumer demand and net value. **Do not promote** new API/SQL/runtime from the research alone.

**Current disposition:** RD-01 `DESIGN` / optional inbox implementation **HOLD**; RD-02 `DESIGN` / generic retry/lease library **HOLD**; RD-03 technical task contracts **DEFERRED** pending evidence. Keep `v0.3.2`, DEC-K020–029, the existing three JARs, released wire v0.2, JDBC V1–V3, product authority, IAM G3 and #41 gates untouched. No implementation, experiment, consumer edits, PR merge, release or deployment.
