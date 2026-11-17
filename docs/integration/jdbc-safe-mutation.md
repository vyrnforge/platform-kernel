# Safely compose retriable JDBC mutations (v0.3.2 APIs)

This is the supported **developer integration recipe** for the optional `platform-kernel-jdbc` artifact. It does not introduce a new runtime contract, IAM provider, data owner, transactional outbox guarantee or migration. Review [reliability semantics](../contracts/reliability-semantics.md), [production hardening](../v2/production-hardening.md), and [consumer conformance](consumer-conformance.md).

## The two distinct operations

1. The resource-owning application **authenticates and authorizes each attempt**, including a request that may result in REPLAY. Confirm tenant ownership and domain authorization against current authoritative state; use a fingerprint bound to the effective actor, resource and payload.
2. `JdbcIdempotencyPort.begin(request)` atomically returns ACQUIRED, REPLAY, IN_PROGRESS or CONFLICT. **Only ACQUIRED is allowed to run the mutation**. REPLAY is returned only after the current application authorization check.
3. For ACQUIRED, call `JdbcReliabilityTransaction.executeIdempotent(lease, resultCodec, work)`. The supplied JDBC `Connection` owns the business mutation; use the supplied event and audit intent ports. Do not call `connection.commit()` or `rollback()` inside work.
4. Return a serializable safe replay result only after commit. Never store/replay time-limited secrets or signed URLs. Caller interprets IN_PROGRESS and CONFLICT in its API protocol.
5. If work fails, its transaction rolls back. The acquired lease remains IN_PROGRESS until explicit abort or expiry, as documented. Do not blindly abort after an uncertain commit; first reconcile the operation.
6. Operate the outbox separately with bounded transport timeouts and at-least-once receivers. A successful remote send followed by lost DB claim may produce duplicates; consumers must deduplicate.

## Minimal Java composition

```java
// Preconditions: credential was actually verified; current tenant membership,
// effective module entitlement and product resource authorization already passed.
IdempotencyDecision<String> decision = idempotencyPort.begin(request);

switch (decision.type()) {
    case ACQUIRED -> {
        String committedResult = transactions.executeIdempotent(
                decision.lease(), IdempotencyResultCodec.strings(),
                (connection, events, audits) -> {
                    // Use connection for the product-owned SQL mutation.
                    // Emit any required events.accept(event) and audits.accept(audit).
                    // No external network calls or local commit here.
                    return domainResult;
                });
        // Return committedResult to the authorized caller.
    }
    case REPLAY -> {
        // Authorization was rechecked BEFORE begin; result must remain safe to return.
        String authorizedReplay = decision.replay().result();
    }
    case IN_PROGRESS -> {
        // Respond with the application's documented safe retry semantics.
    }
    case CONFLICT -> {
        // Reject key reuse with different effective request semantics.
    }
}
```

Variables such as `request`, `idempotencyPort`, `transactions` and `domainResult` are application-owned. This is a composition pattern, not a ready-made handler or authorization wrapper.

## Avoid

```java
var acquired = idempotencyPort.begin(request);
// BAD for durable retriable mutations: independent transaction.
transactions.execute((connection, events, audits) -> mutate(connection));
// BAD: crash between commits loses replay atomicity.
idempotencyPort.complete(acquired.lease(), result);
```

`IdempotencyPort.complete` remains part of the generic adapter contract for compatibility; this guide does **not** deprecate or delete it. Do not model a durable retriable mutation as `execute + complete`.

## Acceptance before consumer adoption

Prove same-connection atomicity, rollback, lost response/replay, key conflicts, expiry, stale lease, concurrent retry, negative tenant scope, authorization on replay, and real host SQL ownership. Observe outbox PENDING/DEAD/lost-claim and restore/reconciliation. The Kernel's synthetic tests do not replace an independent consumer acceptance under issue #41 or a product's own review.
