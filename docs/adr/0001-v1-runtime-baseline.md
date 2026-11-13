# ADR-0001 — V1 Runtime Baseline

- **Status:** Accepted for V1 implementation
- **Date:** 2026-11-13
- **Scope:** implementation choice, not a platform invariant

## Context

Phase 0 freezes semantics, ownership, compatibility rules, and guarantees while keeping implementation technology replaceable. The first repository slice needs a concrete build/runtime baseline without turning that choice into a consumer-facing dependency.

## Decision

For V1 repository initialization:

- use Java 21;
- use Maven 3.10+ with a multi-module build;
- keep `kernel-core` framework-neutral and free of Spring/database/broker dependencies;
- package Phase 0 JSON schemas as a separate `platform-kernel-contracts` artifact;
- provide deterministic in-memory adapters in `platform-kernel-testkit`;
- defer HTTP framework adapters, persistence, event transport, and audit storage until a real consumer requires them.

## Rationale

This establishes executable code with low dependency surface and strong module boundaries. It is compatible with the modular-monolith direction while avoiding premature infrastructure. A future Spring, Jakarta, Quarkus, Micronaut, or other edge adapter can depend on `kernel-core` without changing its semantic contracts.

## Consequences

- Consumer-facing semantics must not rely on Java framework types.
- No database or broker is required for Milestone 1.
- Framework-specific modules may be added later as replaceable adapters.
- Changing the Java/runtime implementation later is allowed if the contracts and guarantees remain compatible.

## Supersession

This ADR may be replaced by a later V1 implementation ADR. A runtime change is not automatically a platform architecture change unless it changes consumer-facing contracts or approved guarantees.
