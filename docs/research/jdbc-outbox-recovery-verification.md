# JDBC outbox recovery/fencing — additional failure-timeline verification

**Status:** test-only candidate, not approved production implementation. Baseline `71dcd337fb2ac2fd5515a8bb711cbb09dd5a718e`; published v0.3.2 unchanged. Reference [RD-01/02 failure contracts](rd01-rd02-failure-contracts.md), [current reliability semantics](../contracts/reliability-semantics.md) and [FAA-03](../integration/consumer-conformance.md).

## Distinct coverage added
The existing `JdbcReliabilityIntegrationTest` already covered basic claim expiration, retry/DEAD, stale worker's **failed** transport after another worker claimed, transaction rollback and concurrent idempotent replay. This increment adds **two** tests in its existing PostgreSQL Testcontainers fixture (no new database/service):
- `crashAfterClaimIsRecoveredByNewPublisherAfterLeaseExpiry`: an injected `AssertionError` represents abrupt worker termination before local claim-state update. Before expiry, successor cannot send; afterward it can reclaim/publish. Both transport callbacks may have executed, so the test **does not assert exactly-once remote delivery**.
- `lateSuccessfulTransportAfterTakeoverDoesNotOverwriteNewClaim`: original transport returns success only after time advances past its lease and a successor has reclaimed/published. The stale completion returns `lostClaims` and **cannot overwrite** `PUBLISHED`, even though two external sends are observable.

Both tests use the shared deterministic `MutableClock` and isolated Testcontainers database reset; they do not call any real external provider. These checks cover a bounded subset of RD2-AC01/03 and R12-10/17. They **do not** establish restore/RPO/RTO, cross-system external fencing, remote cancellation, all RD-01/02 timelines, independent consumer equivalence, or IAM E1b/K2 authorization.

## Review/acceptance
Run exact generated-merge protected Java21 Maven `verify`, CodeQL and dependency review; inspect test log, assertions, DB status and zero-fail outcome. Human Security/QA/Database review required before any ready/merge authorization because this tests security-critical reliable delivery; no previous documentation-only review exception applies. **Test failures imply a real Kernel defect requiring separate remediation decision, not an automatic API change.** No production Java, schema, migration, POM, public API, CI workflow, consumer source, release or deployment changed.
