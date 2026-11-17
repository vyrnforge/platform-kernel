# K-RD-A01 — Trusted asynchronous context propagation research

**Status:** Kernel-only proposed DESIGN, 17 Nov 2026. **Not** a supported async API, ThreadLocal hook, actor-authority transfer, deployed tracing adapter, new schema or executable test. Baseline main `53286741869e1e5354c415faf6cd1c26a3ac41f8`, released v0.3.2. Sources: [CorrelationPropagation](../../platform-kernel/src/main/java/io/vyrnforge/platform/kernel/observability/CorrelationPropagation.java), [CorrelationContext](../../platform-kernel/src/main/java/io/vyrnforge/platform/kernel/context/CorrelationContext.java), [HttpRequestContextAdapter](../../platform-kernel/src/main/java/io/vyrnforge/platform/kernel/http/HttpRequestContextAdapter.java), [RequestContextPipeline](../../platform-kernel/src/main/java/io/vyrnforge/platform/kernel/pipeline/RequestContextPipeline.java), [EventEnvelope](../../platform-kernel/src/main/java/io/vyrnforge/platform/kernel/event/EventEnvelope.java), [TelemetryAttributePolicy](../../platform-kernel/src/main/java/io/vyrnforge/platform/kernel/observability/TelemetryAttributePolicy.java); [FAA-03](../integration/consumer-conformance.md), [KPR-04/05/07/12](../strategy/kernel-pattern-register.md), DEC-K020–029.

## 1. Source-grounded boundary

The **existing** Java helper `CorrelationPropagation.root` creates new request+correlation UUIDv7; `continueInbound` retains a caller-supplied canonical correlation ID and creates a new request ID; `fromEvent` preserves event correlation and derives causation from the event ID; `child` preserves the parent correlation and trace text but accepts an explicitly supplied UUIDv7 causation ID. These methods handle **diagnostic identity**, not credential verification, membership, entitlements or resource authorization. `HttpRequestContextAdapter` extracts requested tenant/correlation + credentials; `RequestContextPipeline` independently authenticates, checks tenant consistency, membership/entitlement and resource owner policy, in that order. An HTTP header or serializable `ActorContext` alone cannot establish trust in a worker.

The current `CorrelationContext` fields are `requestId`, `correlationId`, nullable `causationId`, nullable `traceparent` and `tracestate`. Current `CorrelationPropagation` normalizes length/CRLF and preserves trace text as *opaque* metadata; no full W3C Trace Context parser or OpenTelemetry runtime is present. Wire v0.2 `traceparent` and `tracestate` are optional and only length-constrained in schema. Do not infer full W3C validation or successful remote trace continuation from this helper.

## 2. Four kinds of context must stay separate

| Channel | Purpose | May be forwarded? | Must not be inferred |
| --- | --- | --- | --- |
| **Correlation** | Safe business flow ID, request ID, cause reference | Correlation across explicit hops; new request ID per accepted operation, appropriate cause link | Authorization, signing, verified identity, guaranteed trace parent-child |
| **Tracing** | `traceparent`/`tracestate`, sampled/spans, OpenTelemetry | Only after inbound trust/format/privacy policy and downstream boundary assessment | Actor privileges, tenant permission, arbitrary W3C conformance by existing Kernel |
| **Verified identity/scope** | Issuer+subject, actor type, requested tenant and verified authority | Trusted identities may be *referenced*, but credential/projection must be revalidated when executing sensitive action | Raw client-supplied actor/tenant headers, stale memberships, IAM DEPLOYMENT as consumer TENANTLESS |
| **Operation authority** | Domain-owned permission, current entitlements, resource ownership and any pinned configuration | Resolve locally or via authoritative port at execution time | Durable authorization from old queue payload or copied security principal |

**Proposed model** (not new Java class): a **diagnostic propagation envelope** (business correlation ID, causal event ID, sanitized trace context) plus a separate **execution admission request** (trusted source/provenance, explicit scope, local policy revalidation and operation key). If service/worker needs its own credential, use an explicit authenticated service identity, not an inherited end-user token. Retained actor reference is *audit provenance*, not an impersonation grant.

## 3. Transition matrix — who may trust what

| Hop | Inbound source | Diagnostic behavior proposal | Security/authority check (product-owned) | Rejection / uncertain case |
| --- | --- | --- | --- | --- |
| HTTP edge → handler | Untrusted headers and bearer | Normalize correlation/trace metadata; generate per-request request ID | Verify token using actual IdP, tenant membership and domain policy | Duplicate/oversize/CRLF headers, forged tenant/actor rejected; correlation never proves auth |
| Handler → in-process executor | Already accepted request; explicit parameters | Copy immutable correlation and cause intentionally, never ambient shared mutable global | Bound work still checks current authorization if delayed or retried; avoid raw token/task snapshot | Executor pool reuses thread after tenant A→B; no thread-local bleed |
| Handler → durable queue | Versioned message/intent | Persist correlation and minimal causation ID as non-secret identifiers | Queue is not identity provider; consumer authenticates message provenance and resolves allowed tenant | Forged actor/tenant claim or mismatched producer; fail closed |
| Outbox → event receiver | EventEnvelope plus transport authentication | Receiver `fromEvent` can preserve correlation and event causation; new local request ID | Verify producer, event scope, receiver permissions and business policy | Missing tenant allowed only for explicit system event policy; don't read tenant data |
| Job retry / delayed callback | Durable work key and original cause | Preserve business correlation, issue new attempt-specific request/trace as chosen | Recheck current caller/system authority, leases and product revision/config pins | Revoked actor, expired grant, stale claim; reject/record without effect |
| Cross-service integration | Trusted or external peer boundary | Decide whether to carry, restart or drop `traceparent`/ `tracestate` | Independently authenticate outbound service/receiver | Never send credentials, sensitive baggage or internal actor/tenant data by default |
| Tenantless/system action | Explicit globally authorized operation | New request ID, optional correlation; cause from accepted system event only | Current explicit tenantless policy; IAM DEPLOYMENT **not** implicit | Reject tenant resource access under `TenantContext.none()` |
| Scheduled maintenance | Worker/service identity | Dedicated root correlation or causal chain from scheduler | Service identity scoped to operation, least privilege; no end-user impersonation | Do not accept unvalidated caller actor snapshot |

## 4. Proposed negative/positive matrix (design vectors only)

| ID | Scenario | Expected oracle |
| --- | --- | --- |
| ACP-01 | `root` called twice | Two distinct request IDs and business correlation IDs with canonical UUIDv7; no invented causation |
| ACP-02 | `continueInbound(validCorrelation)` | Preserves correlation, new request ID; no implied actor authority |
| ACP-03 | `continueInbound(UUIDv4)` or malformed ID | Reject at helper; no silent ID weakening |
| ACP-04 | `fromEvent` with accepted envelope | Correlation inherited, `causationId=eventId`, new local request ID |
| ACP-05 | `child(parent, validCause)` | Keeps parent business correlation, sets explicit cause, new request ID |
| ACP-06 | Invalid W3C traceparent but bounded length and no CRLF | Current helper may accept as opaque; **W3C parser/adapter must not trust as valid trace**; define drop/restart policy separately |
| ACP-07 | CR/LF or overlength trace metadata | Helper/edge rejects where currently documented; no header/log injection |
| ACP-08 | Two concurrent tasks tenant A/B on shared executor | No A identity, membership, data or telemetry leaks into B; clear any framework ambient context in `finally` |
| ACP-09 | Async task created by now-revoked actor | Prior actor can remain historical causation; execute only after current authority policy |
| ACP-10 | Event `tenant_id=null` received | Only separately permitted, authenticated tenantless event processing; no deployment/tenant escalation |
| ACP-11 | Event produced in A but resource owned by B | Reject; no cross-tenant state effect, no B metadata in safe error |
| ACP-12 | Producer assertion of `actor_id` without valid source | Does not become authenticated principal; reject/mark untrusted provenance |
| ACP-13 | Unknown issuer with identical subject to trusted issuer | Identity references remain distinct; no identity collision |
| ACP-14 | Queued result replay after entitlement revoked | Recheck current entitlement and domain authorization before releasing data or mutation |
| ACP-15 | Trace header propagated to external untrusted endpoint | Suppress/restart according to trust boundary, do not transmit internal tenant/actor baggage |
| ACP-16 | Executor cancellation or failed callback | Context state never survives into unrelated task; diagnostic outcome still correlated |
| ACP-17 | Redacted telemetry defaults | Tenant/actor identifiers excluded unless explicit approved privacy policy; no raw bearer/token |
| ACP-18 | Event retried twice | Same stable event ID / business correlation for dedup; independent local request IDs and fresh operation authority |
| ACP-19 | Distributed trace sampling/drop | Business correlation preserved regardless of tracing backend/sampling; trace ID is not correlation ID |
| ACP-20 | Header duplicates / line-break injection | Edge returns safe invalid-context error and new request ID; no diagnostic or secret leakage |
| ACP-21 | Outbound RPC times out, remote may still run | Preserve correlation for reconciliation, no inferred remote cancellation or authority transfer |
| ACP-22 | Context serializes across JVM and JS | Canonical UUIDv7, scope and nullable cause preserved; independent validation after decoding |

**Evidence labels:** ACP-01–05 and ACP-07 are hypotheses directly grounded in helper methods, but **no new tests were executed**. ACP-08–22 are cross-boundary proposed acceptance scenarios, not proofs of any consumer's actual adapter. Existing FAA-03 CC-05–13/19/21/24/26 identify related integration cases.

## 5. Alternatives and minimal promotion hypothesis

| Alternative | Benefit | Cost/risk and disposition |
| --- | --- | --- |
| Explicit method arguments and immutable context (local) | Clear trust/reachability, no framework dependency | Caller boilerplate; **preferred initial approach** |
| Kernel pure helper for diagnostic envelope only | Reuse of correlation and cause semantics if repeated | Potential duplicate existing `CorrelationPropagation`; do not add without proved gap |
| Framework adapters (Spring, Reactor, Micrometer/OpenTelemetry) | Mature async/reactive propagation for applications already using them | Version/dependency churn; optional adapter **outside core**, no SDK selected |
| Ambient ThreadLocal wrapper | Convenient sync code | Thread reuse, async leakage, lost context and implicit authority; **reject as Kernel default** |
| Embed full actor/token in event or tracing baggage | Apparent convenience | Token disclosure, stale authority, privacy leakage; **reject** |

The official [W3C Trace Context](https://www.w3.org/TR/trace-context/) standard defines parsing/continuation and privacy for trace headers. [OpenTelemetry propagation security guidance](https://opentelemetry.io/docs/concepts/context-propagation/) warns that external-origin trace values and sensitive baggage cannot be blindly trusted. Treat them as comparisons, **not** approval to import OTel or make Kernel a tracing framework.

**Proposed study order:** (1) record a representative HTTP→executor→event→retry sequence and trust provenance, (2) compare explicit parameters to application-chosen propagator under same failure timelines, (3) enumerate where current helper suffices vs fails, (4) cost the optional adapter without core dependencies, (5) request separate approval only for a genuinely missing invariant. No implementation, runnable fixture, network trace, consumer edits or production telemetry performed.

## 6. Open design questions requiring human owner

1. On an untrusted incoming but syntactically valid correlation ID, when should the edge continue vs restart? Existing `continueInbound` accepts canonical UUIDv7; **do not silently change this policy**.
2. Which events/tasks legally carry an actor reference vs a system-origin reference? Historical provenance is not impersonation.
3. When is membership/entitlement replayed versus current, and what independent authorizer is trusted? Product policy, not Kernel.
4. Which trace headers/baggage may cross organizational or tenant boundaries? Privacy/security policy; default deny sensitive data.
5. Is there actually a repeatable async-context helper gap in **two independent contexts**? Demand and maintainer remain unverified.

**Exit for DESIGN (no tests run):** explicit context separation, hop trust matrix, 22 falsifiable vectors, no unapproved new API and named Security/Architecture/API/QA review requirements. Any promotion requires independent evidence and DEC-K021/028 investment review.
