# ADR-0003 — V2 JDBC/PostgreSQL reliability baseline

- **Status:** Accepted for V2 implementation
- **Date:** 2026-11-14
- **Scope:** replaceable implementation choice, not a platform invariant

**Distribution update:** [ADR-0004](0004-distribution-and-publication.md) supersedes the historical Maven module/artifact packaging described below. The original runtime and boundary decisions remain valid.

## Context

The Phase 0/V1 contracts require that required event and audit intent cannot be silently lost after a successful mutation, and that retriable API mutations support tenant-scoped idempotency. V2 needs one concrete durable implementation to validate these guarantees with Asset while keeping broker, audit topology, and storage technology replaceable.

File Storage integration is explicitly deferred from V2.

## Decision

Add `platform-kernel-persistence-jdbc` using:

- JDBC as the composition boundary;
- PostgreSQL as the V2 persistence database;
- Flyway migrations;
- a transactional outbox table for domain event publication intent;
- append-oriented audit storage;
- persisted tenant-scoped idempotency state;
- `FOR UPDATE SKIP LOCKED` outbox claiming;
- bounded retries with a terminal `DEAD` state;
- a transport-neutral `EventTransport` port.

Domain code may use `JdbcReliabilityTransaction` to mutate its own tables and record required event/audit intent on the same JDBC connection and transaction.

## Guarantees

- A transaction rollback removes the domain mutation and its required event/audit intent together.
- Successful event intent persists before asynchronous publication.
- Publisher crashes/restarts may cause duplicate delivery; consumers must remain duplicate-safe.
- Publication failures are retried after a configured delay.
- Events exceeding the configured attempt limit enter a queryable terminal `DEAD` state.
- Only sanitized exception class names are persisted as outbox error codes.
- Idempotency state survives process restarts and remains scoped by tenant + operation + key.

## Non-decisions

This ADR does not make PostgreSQL, Flyway, JDBC, or the physical table layout part of the permanent kernel contract.

It does not select:

- Kafka or another broker;
- a central audit microservice topology;
- a distributed transaction protocol;
- event-consumer deduplication storage;
- File Storage integration;
- a connection pool/vendor.

## Evolution

A future adapter may replace PostgreSQL/outbox mechanics if it preserves the approved reliability contracts and migration path.
