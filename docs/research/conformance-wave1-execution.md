# Kernel executable conformance Wave 1 — test-only implementation record

**Status:** DRAFT / QA and Security review required. This is a bounded Kernel-only test increment following [PV/ACP/R12 design](../research/portable-behavior-vectors-spec.md), [consumer conformance](../integration/consumer-conformance.md), and [pattern register](../strategy/kernel-pattern-register.md). Pinned base `71dcd337fb2ac2fd5515a8bb711cbb09dd5a718e`; published v0.3.2 artifact source remains `c86eb33a46fae2843c75181c6b395cd0dc6710fe`. All paths below are new tests or test scripts: **no production API, Java class, Maven dependency, schema, migration or release artifact changed**.

## Selected scenarios and oracles

| Source ID / assurance | New executable check | Precise assertion | Important limit |
| --- | --- | --- | --- |
| PV-04 | `PortableConformanceVectorsTest` | Same external subject, different issuer references unequal | Does not verify actual OIDC signature |
| PV-11/12/13 | Same | Explicit NONE vs TENANT, non-null/missing invariant | Java record only, not full JSON Schema validation |
| PV-17 | Same | UUIDv7 accepted, UUIDv4/uppercase canonical form rejected | Does not prove monotonic IDs |
| PV-18 | Same | Bounded opaque trace accepted as-is, CR/LF rejected | W3C trace syntax not parsed by current helper |
| PV-16, ACP-02/04 | Same | Event→request preserves business correlation and event causation, new request ID | No asynchronous thread propagation implementation |
| CC-05/09/21 replay scope | `ReplayIsolationConformanceTest` | Same client key across tenants produces isolated completed results; same-tenant fingerprint mismatch conflicts | In-memory test fake is not durable or cross-process |
| CC-17/18 claim ownership | Same | At exact expiry old lease rejected after reacquisition, same-key new token only allowed | In-memory idempotency lease, NOT JDBC outbox or remote fencing |
| CC-05/09/21 cross-tenant token misuse | Same | Copied token cannot complete/abort another tenant's lease | Does not provide caller authorization by itself |
| CC-09 replay authorization | Same, explicit pipeline→port composition | Once membership revoked, no replay can be released by the **guarded example**; restoration permits existing replay | Application MUST call verified pipeline before idempotency; library does not enforce this ordering implicitly |
| PV-01/02/11/12/13/17/21/22/27/28/39 (declaration subset) | `check-portable-contract-invariants.py` | Released 11 manifest entries, required/nullability, scope conditional, identity/UUID regex, 4 example names, UTC **declarations** | No generic JSON Schema validator; does not execute malformed payload validation or RFC3339 parser |

The Python standard-library checker runs through existing `scripts/verify-core.sh`, already invoked by protected CI. JUnit classes are under the existing core and testkit Maven test tree; protected `mvn ... verify` runs them. No CI workflow, dependency or production code modifications. Check ID traceability is **subset**: the 40 PV/22 ACP/25 R12 proposal suite is **not implemented in full**. At review, record exact actual checks/test counts and explicitly mark unexercised vectors **NOT RUN**, never PASS.

## Existing adjacent coverage retained

`RequestContextPipelineTest` already checks missing/foreign tenant, disabled module and domain hook denial; `HttpRequestContextAdapterTest` covers duplicate credentials and cross-tenant safe 404; `InMemoryIdempotencyPortTest` covers basic acquired/in-progress/conflict/replay/abort/expiry; `scripts/check-contract-compatibility.py` already pins immutable v0.1 and v0.2 transformation. Wave 1 adds the cases above rather than duplicating existing tests. All schema declarations are read-only and maintain v0.2 artifact semantics.

## Evidence, review and exit gates

- Automated CI: protected `verify` (Java 21 / Maven 3.9+ / Java source/testkit and contract checker), `CodeQL`, `dependency-review`. Pin actual head SHA and GitHub generated checkout/revision in PR after results. Never claim independent reviewer evidence from CI.
- Human QA/API: assess vector-to-oracle correctness, ensure structural/schema limitations are explicit, recheck exact test coverage and deterministic timing.
- Security/Architecture: review fail-closed replay guard, false confidence in in-memory fake, tenantless/deployment boundaries, untouched IAM ADR-0085/G3 and domain authorization.
- Product owner: distinguish test acceptance from promotion of a new runtime feature; no code merge or release without separately recorded approval and repository protections.

**Explicit remaining future work:** real JSON Schema 2020-12 validator vectors incl annotation/assertion mode; old/new serialized producer/reader interop; current policy re-check across actual distributed async boundaries; JDBC database fault/restore and outbox A→B fencing; real consumer and independent QA/Security acceptance. None is claimed covered or authorized by this test-only increment.
