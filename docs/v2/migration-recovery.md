# V2 migration, rollback, and recovery guidance

## Artifact upgrade

V2 artifacts are versioned `0.2.0`. Consumers upgrading from the early `0.1.0-SNAPSHOT` line should treat the prior builds as development snapshots rather than stable releases.

The published Phase 0 v0.1 JSON schema directory is frozen by CI. Breaking contract work must use a new versioned contract directory and migration notes rather than editing v0.1 in place.

## Database migration

`KernelJdbcMigrator` applies Flyway migrations in order. For V2, `V1__kernel_reliability.sql` creates:

- `platform_event_outbox`;
- `platform_audit_event`;
- `platform_idempotency`.

Apply migrations before enabling the JDBC reliability adapter in application traffic.

## Rollback

Application rollback must not automatically reverse an already-applied database migration that contains durable audit, outbox, or idempotency data.

Preferred rollback sequence:

1. stop/disable the new application version;
2. roll application code back to a version that tolerates the V2 tables;
3. preserve reliability/audit data;
4. only remove schema objects through a separately reviewed migration after confirming they are no longer required.

Do not use destructive down-migrations as an automatic deployment rollback mechanism.

## Event recovery

Pending outbox rows are safe to resume after process restart. Claim leases expire through `locked_until`, so abandoned claims can be reclaimed.

Transient failures return rows to `PENDING` with a future `available_at`. Events reaching the configured maximum attempts enter `DEAD`.

A production operator must monitor `DEAD` rows and either repair/re-drive them with an explicit procedure or reconcile the affected domain state. V2 intentionally does not invent a broker-specific dead-letter queue.

## Idempotency recovery

Idempotency records persist across application restart. Expired records may be discarded/reacquired according to the caller-defined expiration policy.

Completed records should be retained through their intended replay window. Cleanup should be bounded and tenant-aware.

## Audit recovery

Audit rows are append-oriented. Backups and restore testing must include the audit table. V2 does not claim tamper-proof storage; stronger tamper-evidence can be added when a concrete compliance requirement justifies it.

## File Storage

No File Storage migration or integration work is included in V2.
