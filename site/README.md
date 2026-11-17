# Platform Kernel documentation site

A focused React 19 / esbuild site for the **published Platform Kernel v0.3.2** Java 21 library. It is a documentation entry point, not another Kernel runtime or dashboard.

## Information architecture

Four separate destinations use hash routes, so deep links and browser Back/Forward work on GitHub Pages:

| Destination | Route | Purpose |
| --- | --- | --- |
| Home | #/ | One dependency preview, a three-step start and an ownership summary. |
| Documentation | #/docs/install, /first, /request, /jdbc, /assure | Task-oriented, source-pinned usage examples; full-text guide search, syntax-highlighted code tabs, run commands and verification. |
| Playground | #/playground | One browser-only integration learning model: core, trusted API and optional JDBC. |
| Reference | #/reference/architecture, /capabilities, /releases | Ownership, deployment, full capability inventory and release evidence. |

There is no secondary marketing catalog, Journey Selector, Flow Studio, duplicate integration hero, slideshow or inline documentation mega-section. Legacy fragments (#docs, #workbench, #start, #capabilities, #architecture) map to the matching new destination.

## Source layout

- src/main.jsx — four destinations, shared header/footer and concise homepage.
- src/routes.mjs — route parsing and legacy fragment mappings.
- src/DeveloperDocs.jsx, src/developer-docs.css and src/docs-data.mjs — the five published-release guides.
- src/IntegrationWorkbench.jsx, src/kernel-workbench.css and src/workbench-data.mjs — the single interactive learning model with Maven/Java starting points.
- src/Reference.jsx — consolidated capability, architecture and release reference.
- src/data.mjs — release/source metadata and boundaries. Released source pinned to c86eb33a46fae2843c75181c6b395cd0dc6710fe.
- src/style.css and scripts/browser-smoke.mjs — responsive UI and Chromium end-to-end checks.

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
