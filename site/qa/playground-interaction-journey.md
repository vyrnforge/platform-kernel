# Playground — public-contract integration acceptance handoff

**Revised:** 19 November 2026 · **Owners:** Frontend / QA / UX & Accessibility / Security
**Policy:** [DOCSEC-01–05](https://github.com/vyrnforge/platform-kernel/issues/110), DEC-K035.
**Published baseline:** Java 21, v0.3.2. v0.4.0 remains candidate/UNPUBLISHED.

## Intent

The one Playground route helps developers select a Kernel capability, understand product ownership, prepare a consumer, **check an expected published outcome**, and copy an actual released example. It is a browser-only guide. It must not claim to execute IAM/JDBC/domain logic or display an internal implementation decision trace.

The five visible task phases remain Choose, Understand, Prepare, Check, Implement. All nine capability selections remain reachable, and unsupported old query combinations must explain their safe fallback. Four website destinations and the existing Documentation search and Release Reference remain. Check that browser Back/Forward and direct URLs retain the selected capability, scope and scenario.

## Contract-level scenarios to verify

| Public task | Expected visible result | Required consumer responsibility |
| --- | --- | --- |
| Core first run | CORE READY and a runnable, published Java 21 example | Propagate IDs/correlation through the application |
| Unverified identity | DENIED 401 | IAM/IdP/app must verify credentials before trusted identity |
| Scoped without tenant | DENIED 403 | Establish one trusted active tenant |
| Tenantless with active tenant | REJECTED 400 | Enforce explicitly tenantless endpoint policy |
| Cross-tenant reference | NOT FOUND 404 | Owning product prevents cross-tenant data exposure |
| Missing membership or disabled module | DENIED 403 | Authoritative membership/entitlement ports; domain auth is still separate |
| Domain permission denied | DENIED 403 | Owning product denies the resource action |
| Durable new mutation | ATOMIC INTENT COMMIT | One product-owned transaction for domain data and required intents |
| Completed retry | SAFE REPLAY | Fresh authorization; no duplicate domain SQL or new intents |
| Concurrent retry | IN PROGRESS | Do not start another mutation; provide safe retry guidance |
| Different fingerprint/same key | CONFLICT 409 illustration | Reject conflicting intent; HTTP status is product-owned |

The actual published request and JDBC documentation, not the browser, remains authoritative for error details and implementation examples. Do not remove request identity, tenant, authorization, audit/outbox or replay safety warnings to simplify a page. The bundled source should not contain retired internal trace explanations.

## Automated checks (cannot certify WCAG)

- `npm test`, `npm run build`, `node scripts/site-quality.mjs`, `python3 ../scripts/check-docsec-publication.py --source --site`.
- `node scripts/browser-smoke.mjs`: four destinations, navigation, deep links, public outcome scenarios, keyboard/code selection, clipboard denial/recovery, routes, rendered contrasts/reflow and Docs.
- `node scripts/verify-onboarding.mjs`: released Java 21, Maven/Gradle consumer artifact resolution on supported runner. Windows PowerShell check is separate.
- `mvn -Prelease-docs clean verify` and `python3 scripts/check-docsec-publication.py --jars` when publication-ready library contents are built, or explain exactly which scope was skipped.

Record PR SHA, run ID, digest and deviations. A green source/static scan does not classify future diagrams by itself. A green Chrome accessibility tree is **not** independent human WCAG or screen-reader acceptance.

## Manual acceptance — remains pending until performed

- Windows Firefox keyboard-only: Enter/Space buttons, focus after route/phase changes, browser history and error recovery; avoid keyboard traps.
- NVDA + Chrome and VoiceOver + Safari: heading sequence, scenario choice, status announcement, expected outcome and code tabs. Record OS/AT/browser versions.
- Real browser 200% and 400% zoom: correct content order, no hidden critical instructions, no noncode horizontal overflow; take screenshots.
- At least two genuinely unfamiliar Java adopters and two integration developers: start from Home, run first published program, then identify who owns identity, domain authorization and JDBC retry safety. Record first failure, completion and task time; do not impersonate independent participants.
- Security/API/JDBC reviewer: confirm source-exact public contract and absence of specifically classified internal content, not just keyword-based scan.

## Evidence register

| Criterion | Revision or artifact | Environment + test | Outcome | Evidence link | Reviewer |
| --- | --- | --- | --- | --- | --- |
| DOCSEC-AC02 onboarding and outcomes | Pending revised PR | Real developer session | MISSING | — | Human QA |
| DOCSEC-AC03 public disclosure | Pending revised PR build | Site source + bundle + JAR scan | MISSING | — | Security |
| DOCSEC-AC04 retained contract semantics | Pending revised PR | Security/API/JDBC review | MISSING | — | Qualified reviewer |
| DOCSEC-AC06 accessible task flow | Pending revised PR | Firefox, NVDA, VoiceOver, zoom | MISSING | — | Human QA |
| DOCSEC-AC07 checked artifact | Pending revised PR | Node/Chrome/CI + Java consumer | MISSING | — | QA |

Historical detailed-gate walkthrough instructions from earlier revisions were explicitly superseded by DEC-K035. They remain in immutable public Git history and are not evidence that the new UI has been accepted.
