# Identity, tenant scope and domain authorization — UX issue #79

**Scope:** Website-only usability of published v0.3.2 `RequestContextPipeline`, `HttpRequestContextAdapter` and `HttpKernelErrorMapper`. Unpublished v0.4.0 convenience APIs are excluded. Reviewed immutable published source commit `c86eb33a46fae2843c75181c6b395cd0dc6710fe`. The application or IAM/IdP verifies credentials before trusted normalized identity is constructed.

## Shortest task paths (no new simulator)

- **Tenantless global request:** real credential verification → trusted normalized actor → tenantless policy with no active tenant/tenant-owned resource → app DomainAuthorizationHook → product action. Membership and entitlement are *not required*; domain authorization **is required**.
- **Tenant-scoped resource:** real credential verification → trusted actor and exactly one active tenant → authoritative resource tenant guard → application membership → application entitlement → app DomainAuthorizationHook → product query filtered by tenant.
- **Failure:** the first failing gate stops processing, later gates are *not reached*. Use the existing request guide's failure table to find safe next action, then follow an internal Playground link for a deterministic educational trace. The simulation does not run live Kernel/IAM/SQL.

## Published source mapping and safety

| Failure code | HTTP mapper | First gate | Responsible remediation |
| --- | --- | --- | --- |
| AUTHENTICATION_FAILED | 401 | Identity adapter; external verifier can reject earlier | Verify token/session with real IdP/IAM; never treat a raw header as a trusted projection |
| INVALID_CONTEXT | 400 | Tenantless active-tenant conflict | Use tenantless only for global resource, never bypass tenant-owned records |
| TENANT_REQUIRED | 403 | Scoped endpoint without active tenant | Require exactly one explicitly trusted active tenant |
| TENANT_CONTEXT_MISMATCH | 404 | Resource tenant mismatch | Get tenant ownership from product data; hide cross-tenant existence |
| TENANT_MEMBERSHIP_REQUIRED | 403 | Membership port | Check authoritative actor/tenant membership |
| MODULE_DISABLED | 403 | Entitlement port | Check matching tenant/module, enabled and effectiveAt |
| DOMAIN_ACCESS_DENIED | 403 | Product domain policy | Evaluate resource action and tenant-filtered SQL. Applies to tenantless too |

`HttpKernelErrorMapper` maps Kernel failures after HTTP edge mediation. Independent application verifier rejections and domain-specific error codes are owned by the application and need separate mapping. Always include safe `request_id` and `correlation_id` for debugging, never log raw tokens, secrets, arbitrary personal claims or resource payloads.

## Verifiable journey / acceptance script

| ID | Steps | Expected result | Evidence |
| --- | --- | --- | --- |
| R01 | Open `#/docs/request`, read scope choices, choose tenantless flow | Membership/module appear *not required*, domain authorization still runs; no "anonymous" language | Unit/Chromium planned |
| R02 | Choose tenant-scoped and a missing tenant scenario | `TENANT_REQUIRED` / 403 and no later membership/SQL | Unit/Chromium planned |
| R03 | Choose cross-tenant resource from failure table | `TENANT_CONTEXT_MISMATCH` / 404, no resource existence disclosure | Unit/Chromium planned |
| R04 | Follow membership denial link with keyboard | Playground shows first blocked membership gate; heading focus and safe return to guide | Chromium planned; NVDA/VoiceOver pending |
| R05 | Choose module-disabled and denied domain scenarios | Distinct owners/diagnostics; 403 and later steps unexecuted | Unit/Chromium planned |
| R06 | Inspect source-pinned Java Wiring tab | Four-port released v0.3.2 constructor and typed application ports; explicitly non-runnable excerpt | Published artifact compilation planned; actual consumer integration pending |
| R07 | Send real HTTP requests through a product verifier and app-owned DB | Real tenant isolation, safe logs/correlation and no accidental authorization bypass | **Issue #41 real consumer testing — not performed here** |

### Evidence status

- **Confirmed source:** four-port v0.3.2 constructor, trusted projection expectations, tenantless vs tenant-scoped guards, `HttpKernelErrorMapper` statuses and request correlation contract. No runtime API or schema change made.
- **Automated:** unit contracts, website navigation and exact-source compiled consumer proof (when CI passes).
- **Manual outstanding:** real Windows/Firefox keyboard, NVDA/VoiceOver, actual 200%/400% zoom, actual IAM/IdP and database tests, and developer comprehension task sessions. Treat these as untested until evidence exists.
- **Open ownership:** UX specifies journey and recovery; Frontend implements existing guide/Playground; Security/API owner verifies source semantics; QA owns actual AT/consumer proof. Runtime/consumer release acceptance remains in issues #54 and #41.

No change to Java runtime, Maven artifacts, tenant model, IAM, File Storage, or v0.4.0 release process is authorized here.

## Identity/request wizard alignment after runnable core onboarding — 19 November 2026

Issue #79's foundational request guide and published v0.3.2 constructor were already implemented and merged in PR #86; this focused follow-up does **not** reimplement identity, add IAM adapters, or revise a release. The user requested the next onboarding improvement after merging PR #100, so the remaining gap is to bring the already documented failure recovery and compiled four-port wiring excerpt into the same capability-selected wizard.

The existing `developerGuides.request.failureCases` is the **sole** source of the diagnostic failure code, HTTP response, responsible owner and remediation; the wizard's decision simulation remains explanatory. On a blocked request step, the user now sees an inline diagnosis for the selected scoped/tenantless scenario and a link to Docs → Request failures. The system does not verify actual credentials, issue a response or read product SQL. A successful request has no failure card.

The identity/HTTP/module Implement step shows a **Wiring excerpt** tab reusing the canonical published request Guide sample exactly, alongside its existing Maven and scoped/tenantless endpoint excerpts. This is an incomplete integration example requiring a real IAM/IdP verifier, membership port, entitlement port and product-owned authorization hook, not a complete runnable application. The independent published v0.3.2 constructor compile proof already exists in the onboarding consumer workflow and remains its acceptance source.

Automation should assert published failure code/HTTP/owner/recovery for cross-tenant 404, unverified 401, missing membership 403, tenantless-context 400 and tenantless domain denial 403, with no invented failure on a valid tenantless request; verify exact wiring excerpt/source parity, accessible native tab behavior, and a link back to the on-site request failure guide. Real verifier integration, tenant-filtered SQL, physical keyboard/NVDA/VoiceOver/200%-400% zoom, and human newcomer comprehension remain explicitly OPEN under #79, #77, #41 and #76.
