# Public documentation and disclosure boundaries

**Policy:** DEC-K035 (19 November 2026) · **Tracking:** [DOCSEC #110](https://github.com/vyrnforge/platform-kernel/issues/110) · **Baseline:** Java 21 and published v0.3.2. This policy concerns public information surfaces, not runtime secrecy.

## Classify before publishing

| Class | Publish? | Typical content |
| --- | --- | --- |
| PUBLIC-USAGE | Yes, primarily on the website | Getting started, Maven/Gradle coordinates, full runnable Java example, integration tasks, troubleshooting and validation |
| PUBLIC-CONTRACT | Yes, including APIs and Javadocs | Supported Java/wire semantics, consumer responsibilities, tenant and identity boundaries, error/replay/audit/outbox guarantees, version compatibility |
| INTERNAL-DESIGN | Only after explicit declassification; otherwise in access-controlled engineering docs | Nonessential detailed execution sequences, internal tradeoffs, proprietary experiments and decision diagrams |
| RESTRICTED | Never | Actual credentials, private key/revocation material, secret configurations, sensitive infrastructure details and unpublished exploit findings |

Do **not** confuse a public signing key fingerprint, a GitHub secret *name*, synthetic fixture or publicly documented threat control with an exposed credential. Report actual secrets through [private vulnerability reporting](../../SECURITY.md); redact public issue and CI output, revoke/rotate as warranted.

This is a public Apache-2.0 repository. Java source, tags, JAR bytecode, source/Javadoc archives, bundled JavaScript and Git history can all be copied. UI changes do **not** make an already public algorithm confidential. If underlying source must become proprietary, require a separate product/licensing/distribution decision. Do not rewrite public history or delete already published evidence as if it had never been visible.

## Preserve required adoption guarantees

The public site and Javadoc must remain sufficient to securely integrate the released library. At minimum keep:

- Verify credentials through an actual IAM/IdP/app verifier **before** creating trusted actor context. Extracting a bearer header is not verifying it.
- A scoped endpoint requires one trusted active tenant and application-authoritative membership/entitlement; a truly tenantless endpoint has no active tenant. Validate resource tenant and resource-owning authorization on **every** attempt, including retry/replay.
- Safe expected error outcomes (400, 401, 403, existence-safe 404) and product-owned recovery guidance. Do not treat module enablement/feature flags as resource permissions.
- For retriable JDBC, distinguish ACQUIRED, REPLAY, IN_PROGRESS, CONFLICT. Preserve one product-owned transaction for domain data plus required event/audit intents and replay state, no double-write on replay, at-least-once event delivery, receiver deduplication and DEAD/recovery obligations.
- Published Java 21/Maven/Gradle examples, source-exact v0.3.2 coordinates and test-only testkit scope. Keep v0.4.0 candidate examples clearly **UNPUBLISHED**. No releases follow automatically from documentation readiness.
- Cross-product ownership: native IAM/IdP verifies identity, File Storage owns bytes and grants, product domains own business data, transactions and domain authorization.

The site may show *contract outcomes and consumer checks* but must not pretend to run Java, IAM, SQL or an internal Kernel gate engine. Keep four existing site destinations, accessible navigation, deep-link recovery, and canonical on-site developer guides (DEC-K033/034).

## Publication inspection and evidence

The repository's DOCSEC checker is a **bounded defense-in-depth gate**, not a security certification. On changed-site PRs inspect `site/dist/app.js`, `app.css`, and `index.html`; on library PRs inspect runtime, sources and Javadoc JAR ZIP entries. The checker fails for clear restricted markers, known private-key or high-confidence credential patterns, and prohibited packaged internal-doc extensions. Never print the matched content. Separately review source changes, retained security guarantees, generated bundle contents, public release status, Git history and resulting site UX. Supply exact commit SHA, artifact digests and CI run URLs.

A human Security reviewer must approve whether a particular internal-design **candidate** actually needs restriction. The maintainer may prepare a recorded self-assessment, but that is not independent acceptance. Manual assistive-technology/keyboard/zoom and unfamiliar-developer observations remain distinct evidence; Chrome accessibility-tree counts do not certify WCAG.

## Change routing

- DOCSEC-01 #111: classify each surface and record verified private-storage ACL; keep only sanitized status in public issues.
- DOCSEC-02 #112: focus public website on verified usage/outcomes; preserve contracts.
- DOCSEC-03 #113: public Javadocs retain supported API contracts, private Mermaid/design notes stay outside public repo and JARs.
- DOCSEC-04 #114: enforce source/build/package inspection and review checklist.
- DOCSEC-05 #115: reconcile tags/releases/history, real adopter/AT evidence and qualified release acceptance.

Nothing in this policy authorizes a Java runtime/API/schema change, publication, migration, production activation, merge or rollout. Protected checks and owner release authority remain binding.
