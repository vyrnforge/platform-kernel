# Kernel V2 maintenance release checklist

Artifact version: 0.2.1. The released Phase 0 v0.2 JSON schemas remain unchanged.

## Required gates
- [ ] protected Maven verification, core smoke and contract compatibility checks;
- [ ] CodeQL and Dependency Review;
- [ ] PostgreSQL atomic mutation, lost response, concurrent retry, expiration rollback, stale outbox fencing and exhausted-claim recovery tests;
- [ ] negative core/HTTP tenantless endpoint tests;
- [ ] Asset reference golden path uses the atomic transaction method;
- [ ] GitHub release/tag v0.2.1 and Maven publication verified.

Squash-merge only after all protected checks pass, with a commit title beginning
with release:. The release workflow validates VERSION, rejects existing tag
republication, re-runs tests and publishes non-test Maven artifacts.

## Upgrade
Stop/drain old outbox publishers, apply additive V3, and start only hardened
workers. Migrate retriable JDBC writes to executeIdempotent. Review the stricter
tenantless policy and configure production identity, domain data isolation,
transport, monitoring, backup/recovery and load/SLO targets.

See docs/v2/production-hardening.md. Release closure is not certification of
production throughput or exactly-once delivery. Real Asset integration remains
a separate product task; File Storage stays deferred.
