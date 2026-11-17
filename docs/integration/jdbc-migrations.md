# Host application Flyway coexistence (Kernel JDBC v0.3.2)

The optional JDBC adapter contains **immutable** existing V1–V3 SQL scripts in `classpath:db/migration`. `KernelJdbcMigrator.migrate(dataSource)` is a legacy convenience that uses that location and Flyway's **default history table**. It is not a separate Kernel database or a migration orchestrator.

## Choose a single explicit migration authority

- **Standalone/Kernel-controlled database with no application migrations:** the existing `KernelJdbcMigrator.migrate(...)` call is valid. Preserve its history table and immutable scripts on upgrades.
- **Application already owns the default Flyway migration location/history:** do **not** call the convenience method blindly. It may discover unrelated SQL and encounter duplicate `V1`/`V2`/`V3` versions or accidentally apply product migrations. Inventory the application's Flyway history and resource locations. Integrate the exact unchanged Kernel migrations using the application's approved migration pipeline, with nonconflicting version naming/history under a reviewed plan.
- **Fresh application with independently managed namespaces:** a separately configured application Flyway instance can use an application-only location and distinct history table. The JDBC integration suite exercises that coexistence with a small application-owned reference migration. Distinct history does not authorize two independent authoritative business stores.
- **Already deployed application:** never change history-table names, rebaseline, move existing migration checksums or reapply V1–V3 without an explicit data/rollout review. Stop/drain old publishers before V3 and old intent writers before the newer fingerprint logic, as described in [production hardening](../v2/production-hardening.md).

## Responsibilities

Kernel owns only the reliability tables and schema scripts shipped with the optional adapter; every product owns its business data, DDL authority, backup, restore and migration rollout. App DB users should not have migration-level privileges. No global scheduler, shared database or separate migration service is implied.

## Product acceptance

Before enabling migrations in a real host, verify: actual classpath resource discovery; version collisions; which Flyway history table is authoritative; role permissions; pristine install and upgrade from deployed V1/V2/V3; rollback strategy; least-privilege runtime role; and restore. Do not use a synthetic integration test as proof of the target application's migration compatibility.

This revision documents existing behavior and tests one safe coexistence arrangement. Any new namespaced migration API or changed default history requires a separate proposal and migration/backward-compatibility acceptance under DEC-K020–029 and issue #54.
