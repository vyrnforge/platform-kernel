# Kernel V2 production hardening

Status: proposed implementation for review; does not reopen DEC-K013 release closure.
Based on the v0.2.0 implementation and DEC-K008/009/011/012/013.

## P0 controls

1. JDBC mutation: acquire with JdbcIdempotencyPort.begin, then call
   JdbcReliabilityTransaction.executeIdempotent(lease, resultCodec, work).
   The same connection locks the active lease and commits domain mutation,
   event intent, audit intent and result atomically. A lost response can replay
   the committed result within the configured expiration window. Work must use
   the supplied connection, must not commit/rollback it, and must not perform
   non-transactional side effects. On rollback the acquired lease remains
   IN_PROGRESS until explicitly aborted or expired. The older execute + complete
   composition remains source-compatible but is not crash-atomic; migrate
   retriable mutations to the new method. Reauthorize retries and bind
   fingerprints to effective request semantics; protect stored results.
2. Outbox: V3 adds a per-claim UUIDv7 token. Only the current, unexpired claim
   can change state. An expired final attempt becomes DEAD without an extra send.
   Lost claims are visible through OutboxPublishResult.lostClaims().
   Delivery remains at-least-once-compatible: a transport can deliver before
   a crash/lease loss and consumers must deduplicate. A DEAD event can have
   been delivered; reconcile before re-drive. Use bounded transport timeouts,
   batch sizes and leases; synchronize clocks across workers.
3. Tenantless endpoint policy now rejects any active tenant context, including
   a matching tenant-owned resource. Legitimate tenantless requests remain
   supported. Cross-tenant resource mismatches retain 404 mapping; active
   tenant on a tenantless endpoint maps to INVALID_CONTEXT/400. Products must
   still use tenant-scoped data access and authoritative resource references.

## Deployment / rollback

Stop and drain all old publishers before V3 or mixed versions can bypass fencing.
Apply Flyway V3 (additive), then start only hardened workers. Do not roll back
the schema or run old and new publishers together. If rolling back binaries,
stop all workers first and reconcile pending, expired and uncertain deliveries.
Keep event/audit/idempotency data. Use least-privilege database roles and separate
migration credentials; revoke application TRUNCATE/DDL on audit tables.
Retain completed idempotency results through the entire retry window; cleanup
must be bounded and tenant-aware. Monitor PENDING age, DEAD count, lost claims,
retry rate, DB latency and readiness. Establish explicit backup/restore, RPO/RTO,
transport authentication and per-product load/SLO targets before production.

## Acceptance

- PostgreSQL regression tests: lost response/replay, expired lease rollback, concurrent retry serialization, fatal-work rollback,
  stale worker fencing and exhausted crash recovery.
- Negative tenant policy regressions at core and HTTP boundaries.
- Asset reference uses the atomic path (test-only; no real Asset integration).
- Protected Maven CI, CodeQL, Dependency Review and schema baseline pass.

Remaining: multi-process crash/load tests, production identity/membership/entitlement
providers, transport and observability integration, operational acceptance. No
File Storage, workflow, IAM or new domain capability added. No exactly-once claim.
