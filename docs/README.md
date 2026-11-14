# Kernel documentation

Current consumer and maintainer entry point. Use the current distribution guide rather than historical artifact coordinates.

| Topic | Guide |
| --- | --- |
| Adoption / Maven | [Three-JAR distribution](integration/three-jar-distribution.md) |
| Identity | [Trusted identity boundary](integration/identity-boundary.md) |
| HTTP | [Asset reference](consumer/asset-reference-http.md) |
| Events, audit, idempotency | [Reliability contracts](contracts/reliability-semantics.md) |
| JDBC | [Production hardening](v2/production-hardening.md), [migration/recovery](v2/migration-recovery.md) |
| Operations | [Observability and health](observability/observability-health.md) |
| Security | [Repository controls](security/repository-hardening.md), [threat model](security/v2-threat-model.md), [historical internal review](security/v2-security-review.md) |
| Releases | [Release runbook and workflow inventory](releases/README.md) |
| Scope | [V2 scope and exit criteria](v2/scope-and-exit.md) |
| Architecture decisions | [ADR 0001](adr/0001-v1-runtime-baseline.md), [ADR 0002](adr/0002-framework-neutral-http-adapter.md), [ADR 0003](adr/0003-v2-jdbc-reliability.md), [ADR 0004](adr/0004-distribution-and-publication.md) |

The public site visualizes released code and contracts. It is not a deployed runtime or a performance benchmark.
