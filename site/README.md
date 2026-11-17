# Platform Kernel documentation site

A focused React 19 / esbuild site for the **published Platform Kernel v0.3.2** Java 21 library. It is a documentation entry point, not another Kernel runtime or dashboard.

## Fluid layout

All four website destinations use the viewport width with responsive side gutters instead of a fixed 1180px container. Documentation and Reference articles, Playground inspector/code panels, and Home grids expand fluidly. Long-form prose retains a readable line measure; tables/code scroll within their own surfaces rather than forcing horizontal page overflow. Chromium regression checks the actual rendered shell at 1440/1920/2560px as well as narrow/mobile widths. No runtime, artifact or release changes are part of this layout.

## Information architecture

Four separate destinations use hash routes, so deep links and browser Back/Forward work on GitHub Pages:

| Destination | Route | Purpose |
| --- | --- | --- |
| Home | #/ | One dependency preview, a three-step start and an ownership summary. |
| Documentation | #/docs/install, /first, /request, /jdbc, /assure | Task-oriented, source-pinned usage examples; full-text guide search, syntax-highlighted code tabs, run commands and verification. |
| Playground | #/playground | One browser-only integration learning model with shareable selected flow URLs: core, trusted API and optional JDBC; exact decisions, first-stop failure and application ownership. |
| Reference | #/reference/architecture, /capabilities, /releases | Ownership, deployment, full capability inventory and release evidence. |

There is no secondary marketing catalog, Journey Selector, Flow Studio, duplicate integration hero, slideshow or inline documentation mega-section. Legacy fragments (#docs, #workbench, #start, #capabilities, #architecture) map to the matching new destination.

## Source layout

- src/main.jsx — four destinations, shared header/footer and concise homepage.
- src/routes.mjs — route parsing and legacy fragment mappings.
- src/DeveloperDocs.jsx, src/developer-docs.css and src/docs-data.mjs — the five published-release guides.
- src/IntegrationWorkbench.jsx, src/kernel-workbench.css and src/workbench-data.mjs — the single source-aligned decision trace (verification, scope, membership, module, domain policy, retries/outbox), with deep-linkable scenarios, on-site next steps and Maven/Java starting points.
- src/Reference.jsx — consolidated capability, architecture and release reference.
- src/PreviewGuide.jsx and src/preview-data.mjs — the source-reviewed v0.4.0 candidate guide delivered as an in-site Documentation route, not an external GitHub Markdown manual.
- src/data.mjs — release/source metadata and boundaries. Released source pinned to c86eb33a46fae2843c75181c6b395cd0dc6710fe.
- src/style.css and scripts/browser-smoke.mjs — responsive UI and Chromium end-to-end checks.

**Pre-release documentation:** the existing Reference → Versions panel links to the [v0.4.0 developer preview](https://vyrnforge.github.io/platform-kernel/#/docs/preview), marked NOT RELEASED. Pre-release guides are drafted and reviewed before publication; published installation defaults, code examples and source pins stay on v0.3.2. After verified publication, update them through a separate reviewed docs/site change.

**Version discipline:** v0.4.0 candidate APIs, including RequestContextPipeline.tenantless(...) and the optional JacksonRecordCodec(applicationMapper) constructor, must not appear as published v0.3.2 examples. Integration excerpts require application-provided ports and wiring. The playground is NOT a live JVM, token verifier or database and does not prove production conformance. Testkit is test-scoped. Applications own business data, policy, transactions and deployment; IAM/IdP and File Storage remain external authorities.

## Local development

Use Node.js 22+.

    cd site
    npm ci
    npm test
    npm run dev
    # http://127.0.0.1:4173
    npm run build
    node scripts/browser-smoke.mjs  # Chromium/Chrome required; serves dist/

The bundle uses local files and needs no external CDN/backend. GitHub Pages CI builds/tests the PR and runs Chromium smoke. Deploy only when a change is merged to main.

Chromium smoke covers route/focus/keyboard navigation, code rendering, search, and narrow/zoom-equivalent responsive widths; it is not a full manual 200% browser-zoom, screen-reader or WCAG audit. The first Java example and request/JDBC signatures were source-reviewed against v0.3.2, not executed against Maven Central artifacts in the website pipeline. Keep site claims pinned to published Maven Central evidence rather than an unpublished candidate.

## Trace usability and verification

The one Playground is a deterministic **simulation**, not a running JVM, IAM verifier, JDBC transaction or authorization test. The trace separates a check that actually ran from a check intentionally not required (e.g. membership on tenantless) and one never reached after denial. Browser URLs preserve mode, scope and scenario, so guides can link to a relevant failure case. Negative paths for cross-tenant 404, missing membership, disabled module, denied domain policy, replay and in-progress retries match published v0.3.2 contract semantics. Ownership remains with product applications. Screen-reader testing and actual 200% browser zoom still require manual validation.

## Accessibility baseline (issue #77)

See [the QA accessibility task and evidence matrix](qa/accessibility-baseline.md) for source findings, focused Chromium regressions, and separately outstanding actual browser zoom and screen-reader tasks. WCAG 2.2 AA is a *proposed* site quality target, not a certification. This work does not alter the published Java library.

## Published v0.3.2 first-program verification — Issue #78

The documentation first-run examples (Java 21 source, Maven dependency fragment and Gradle Kotlin DSL fragment) are maintained in `src/docs-data.mjs`. A narrow [published onboarding consumer](../.github/workflows/onboarding-consumer.yml) workflow is triggered only for guide/source changes and independently downloads the **released** core JAR from anonymous Maven Central, compares its SHA-1 checksum, records a computed SHA-256, compiles and runs the exact site Java class, and compiles minimal Maven/Gradle consumers. It does not run the full Java/PostgreSQL/release-staging suite. No 0.4.0 APIs or candidate builds may enter this proof.

See [QA onboarding task notes](qa/onboarding-first-program.md) for evidence, blocked local verification and remaining human testing.
