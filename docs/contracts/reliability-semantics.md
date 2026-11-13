# Reliability contract semantics

Status: V1 executable contract guidance derived from DEC-K011 and DEC-K012.

This document describes semantics exposed by the Java library. It does **not** select a database, broker, outbox schema, audit service, or deployment topology.

## EventEnvelope

`EventEnvelope<T>` represents the canonical transport-neutral envelope:

- UUIDv7 `eventId`;
- versioned `eventType` + `eventVersion`;
- UTC `occurredAt`;
- nullable `tenantId` only for legitimate tenantless/system events;
- producer and subject identity;
- UUIDv7 correlation and optional causation;
- optional actor;
- non-null domain-owned payload.

Consumers must assume at-least-once-compatible delivery and use `eventId` (plus consumer-specific state where necessary) to tolerate duplicate delivery.

`EventIntentPort` is intentionally not named after Kafka, a queue, or an outbox. Returning successfully means the implementation accepted responsibility for eventual delivery according to its documented durability guarantee. The calling domain still owns how that acceptance is made atomic with the business mutation.

## AuditEvent

`AuditEvent` is accountability/governance evidence, not an application log or user-facing activity record.

It carries audit ID, timestamp, tenant where applicable, actor where available, action, resource, outcome, source, correlation, safe reason, and optional redacted/domain-specific changes.

`AuditIntentPort` has the same reliability boundary as event intent: a required audit record may not be silently lost after the related operation is acknowledged successful. Physical storage and ingestion topology remain replaceable.

## FileReference

`FileReference` contains only a File Storage reference and optional non-authoritative snapshot metadata. File Storage remains authoritative.

Possession of a `FileReference` **never** implies access. File access authorization must be performed by the consuming product/File Storage integration when the file is used.

External File Storage IDs remain opaque strings; they are not forced into UUIDv7.

## API mutation idempotency

`IdempotencyPort<R>` is for retriable **tenant-scoped API mutations**.

The atomic scope is:

```text
tenant_id + operation + idempotency_key
```

The caller also supplies an opaque `requestFingerprint` representing the effective request semantics.

`begin()` returns one of:

- `ACQUIRED` — caller owns execution via a lease;
- `REPLAY` — the same fingerprint completed previously; replay the stored result;
- `IN_PROGRESS` — the same fingerprint is already executing;
- `CONFLICT` — the key was reused with a different fingerprint.

Records expire according to an explicit caller/service policy. After expiration, a key may be acquired again.

The generic result type `R` is adapter/domain-owned. The kernel does not freeze HTTP response serialization, storage schema, or database locking strategy.

This API idempotency contract is intentionally separate from event-consumer duplicate handling. Tenantless events exist, while the canonical API standard requires mutation-idempotency records to be tenant-scoped.
