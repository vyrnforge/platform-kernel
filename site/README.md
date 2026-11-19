# Platform Kernel developer website

This website is a **usage guide for the released embedded Java library**, not an internal design or architecture simulator.

The canonical public guides are at https://vyrnforge.github.io/platform-kernel/. They explain how to add the published `io.github.vyrnforge` dependencies to a Java 21+ product, call supported APIs, handle failures and verify the product's integration. The public source/Javadocs remain inspectable; hiding website narration is not a confidentiality boundary.

## Public routes

| Route | Purpose |
| --- | --- |
| `#/` | Library value, published dependency and first-program entry |
| `#/docs/install` and guides | Version-pinned Maven/Gradle/Java usage, trusted request API, optional JDBC, consumer checks and troubleshooting |
| `#/playground` | Browser-only **illustrative public outcomes**, consumer responsibilities and released code; does not run IAM, SQL or a JVM |
| `#/reference/architecture` | Library capability contracts, application/IAM/File Storage ownership and published version status |

Keep the four existing navigation destinations, search, safe legacy deep-link recovery and keyboard/focus behavior. The `#/docs/preview` legacy route is retained as a **v0.4.0 release-status-only** page; it does not publish unreleased API samples or internal design detail. Only v0.3.2 is installable in the current published guidance.

**Public usage requires correct security and reliability boundaries.** Never remove credential verification, trusted tenant context, application-owned domain permissions, safe HTTP 400/401/403/404 results, replay reauthorization, JDBC atomic product data and required intents, and at-least-once outbox/deduplication/recovery requirements merely to make a guide shorter. Those are supported consumer contracts, not implementation-only algorithms.

Generic deployment topology galleries, internal execution gate ordering and unpublished API design snippets are outside the public website. Approved implementation-only notes belong in verified private engineering documentation, never in `site/src` or shipped `dist/app.js`. The public Apache-2.0 Java source and old Git history are still inspectable.

## Source and developer checks

- `src/docs-data.mjs`: five released developer guides, runnable/copyable snippets, error and recovery contracts and contextual search.
- `src/public-outcomes.mjs`, `src/workbench-data.mjs`, `src/IntegrationWorkbench.jsx`: expected outcomes for core, request and JDBC usage; no execution-stage simulator.
- `src/preview-data.mjs`, `src/PreviewGuide.jsx`: unreleased version status only, without candidate implementation code.
- `src/Reference.jsx`, `src/data.mjs`: supported capability, ownership and version information.

From `site/` run `npm ci`, `npm test`, `npm run build`, `node scripts/site-quality.mjs` and `node scripts/browser-smoke.mjs` where Chrome is available. From the repository root, `python3 scripts/check-docsec-publication.py --source --site` checks generated assets for bounded prohibited-content and credential patterns. The CI/Page workflows also verify public artifact provenance and source-pinned, published-JAR onboarding on relevant changes.

The current version and deployment must be proven from the exact build/Pages run, not asserted based on a passing local build. Scripted Chromium checks cover representative navigation, links, scenarios, keyboard paths and viewport widths, **not** independent NVDA/VoiceOver, actual browser 200%/400% zoom or WCAG certification. Human post-release acceptance is tracked in GitHub UX issues #76, #77, #82 and #83.

See [public disclosure policy](../docs/security/publication-boundaries.md), [published runtime README](../README.md), and [QA task handoff](qa/playground-interaction-journey.md) for evidence responsibilities. `site/package.json` is intentionally private at version `0.0.0`; it is not the Java library release version.
