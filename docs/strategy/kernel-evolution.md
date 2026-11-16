# Strategic evolution of VyrnForge Platform Kernel

**Status:** Product Owner approved strategic direction, 16 November 2026 (DEC-K020–024); repository documentation pending review. No runtime, experiment, migration, release, deployment or activation authorization.

## Charter and decision record

- DEC-K020: continuously evolving, reusable enterprise technical foundation for independent VyrnForge and external applications. Modular products, unified platform. IAM and File Storage are existing reference consumers; Asset then ITSM remain new-business-product validation priorities. Future application categories are demand scenarios, not commitments.
- DEC-K021: proactive discovery and proposed contract design may precede two implementations. Discover → Design → Experiment → Promote → Adopt. Experiments, supported runtime promotion and consumer adoption require separate approval. Common semantics, demonstrated value, security/reliability, compatibility and maintenance ownership are required. Preserve IAM ADR-0085 actual two-consumer evidence for lifecycle/reliability extraction and E1b/K2 transaction equivalence before JDBC replacement; synthetic scenarios cannot waive those gates.
- DEC-K022: language-neutral interoperability contracts, Java 21 JVM-first reference implementation, embedded library by default. Retain the three distributed JARs per ADR-0004: platform-kernel, platform-kernel-jdbc, platform-kernel-testkit. New physical artifacts, non-JVM SDKs, services, breaking contracts and migrations require separate justification and approval.
- DEC-K023: foundation assurance first; then research inbox/deduplication, retry/deadline/lease/fencing and technical task contracts. Concurrency/pagination and provider integration are supporting candidates. No version or feature-release commitment.
- DEC-K024: canonical documentation and issue #41 alignment only. No implementation, consumer change, PR merge, release, deployment, activation or IAM G3-04+.

## Boundaries

Application composition → optional mechanics/technology adapters → core → portable contracts. Conformance/testkit verifies all layers and remains test-only. Core stays dependency-light, never imports consumer domains or requires a shared server. JDBC remains optional. Each product owns its business data, transactions, permissions, authoritative audit evidence and lifecycle. IAM retains its nine business domains; Platform is technical infrastructure and IdP is composed. IAM DEPLOYMENT, TENANT and consumer TENANTLESS are distinct. Preserve IAM local monotonic UUIDv7, Java 25 runtime and Maven; Storage local grants, bytes, metadata, placement and lifecycle remain Storage-owned. No shared business database, mandatory framework, workflow/BPM, low-code, AI or generic case/policy engine.

## Baseline and consumer evidence

Published compatibility baseline 0.3.2, release source c86eb33a46fae2843c75181c6b395cd0dc6710fe. Strategic assessment inspected Kernel main e107dbd700bda33daf6483d41651b50724f8fc22, IAM main 1dc55509868c89ebb6fd6016c3659d0ae5a0d302, Storage main eb98f1ea2f259e6a345c77117ada9f2237edb1c2. These are not interchangeable with historical exact test revisions. Storage uses core and optional JDBC; IAM core-first compatibility evidence does not authorize migration. Existing v0.2 wire schemas and Flyway migrations remain immutable. Historical V2 Storage deferral is preserved; subsequent Storage adoption is not a revision of historical exit criteria. See [#41](https://github.com/vyrnforge/platform-kernel/issues/41), [IAM ADR-0085](https://github.com/wyrmgate/iam/blob/main/docs/adr/0085-platform-kernel-adoption-boundary.md), and [IAM integration evidence](https://github.com/wyrmgate/iam/issues/538#issuecomment-6912868093). IAM G3 and Storage release acceptance remain independent.

## Outcome-based roadmap

| Stage | Scope | Gate |
|---|---|---|
| 0 | Charter, decisions, capability portfolio and documentation | Owner approved strategic scope; docs PR review only |
| 1 | Portable schemas/fixtures, consumer conformance, compatibility/release evidence and operational guidance; research concurrency/pagination and identity/secret boundaries | Exact artifact/revision evidence, negative scope/replay, Java 21/25 compatibility; separate approval for new runtime/test implementation |
| 2 | Inbox/deduplication, retry/deadline/lease/fencing, technical task contract research | Compare independent consumers, define invariants and failure scenarios; prototypes and E1b/K2 separately authorized |
| 3 | Candidate optional jobs, stateless lifecycle helper, webhook/connector mechanics | Actual common semantics, value, risk, maintenance, migration/rollback and explicit promotion approval |
| 4 | Additional languages or independent shared services | Concrete demand and separate business/architecture decision |

Use existing mature external technology where it meets the need; no wrapper solely for uniformity. Track integration effort, maintained duplication, dependency footprint, compatibility/security regressions, migration and rollback cost, maintenance effort and actual adoption. Collect baselines before setting numeric business targets. No forced upgrades. No commitment to implement all candidates.

## Promotion and release governance

Research does not confer supported API status. Require a concrete problem and owner, representative consumer evidence, boundary and contract, alternatives, negative/failure tests, dependency and operational cost, versioning and migration/rollback. Preserve atomic product-owned mutation plus required event/audit intents and replay result; reauthorize replay; at-least-once delivery; stale lease fencing; no dual authoritative stores or external network inside authoritative transaction. Exact immutable artifacts and consumer revision pins, Java API/wire/persistence/behavior compatibility, supply-chain and independent acceptance gates apply. Consumer acceptance and production readiness remain separate from Kernel release verification. No release is authorized here.

## Canonical sources

The Product Owner-approved Drive Decision & Change Log v0.5 records DEC-K020–024 and CHG-K029; Constitution v0.3, Scope v0.3, Architecture v0.3 and Delivery v0.5 reflect the same decisions. The repository ADRs 0001–0004 remain in force. This document records approved strategic policy, not a new runtime ADR or permission to start later work.
