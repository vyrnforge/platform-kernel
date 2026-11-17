# Platform Kernel product site and developer documentation

A standalone React site combining task-based developer documentation, capability discovery and an interactive Flow Studio. Usage examples target the **published v0.3.2** library; the **v0.4.0 candidate is unpublished** and isolated in the preview. The Java modules and Maven release pipeline are independent of this site.

## Developer documentation experience

The #docs section is the primary first-time developer route. Its searchable guide navigation offers installation (Maven/Gradle), standalone Java code, authenticated tenantless and tenant-scoped request excerpts, optional JDBC idempotent writes, and testkit/consumer conformance. Each guide states prerequisites, when to use it, exact code status (complete vs. excerpt), verification and which responsibilities belong to the application. Every capability explorer card also links to a detailed usage guide.

- `src/docs-data.mjs`: published-version guide data, code examples and link paths; `src/docs-data.test.mjs` enforces version pinning and coverage.
- `src/DeveloperDocs.jsx` and `src/developer-docs.css`: accessible guide navigation, search, code choice, copy with fallback, responsive layout and source links.
- `scripts/browser-smoke.mjs`: exercises guide selection, example switching and 390 px code overflow in addition to the existing Flow Studio and presentation behavior.

Do not expose a main-branch **candidate** API in a published v0.3.2 example. In particular, `RequestContextPipeline.tenantless(...)` and the optional `JacksonRecordCodec(applicationMapper)` constructor are candidate-only until a separate release is approved. For a runnable published-release sample, link to the pinned `c86eb33a...` source, not to `main/verification/GeneralUsageExample.java`. Detailed living documents on main may mention candidate changes; clearly label version gates.

## Local development

Use Node.js 22+:
```sh
cd site
npm ci
npm test
npm run dev
```
Open http://127.0.0.1:4173. Use `npm run build` to generate `dist/`. The build bundles React and CSS locally; no CDN or backend is needed. All paths are relative to support GitHub Pages project URLs.

## Hosting
In repository Settings → Pages, select **GitHub Actions** as the source (one-time administrator action). Merge a site change into main to trigger deployment, or run **Platform Kernel Pages** manually on main. The expected default URL is https://vyrnforge.github.io/platform-kernel/. Every later change to site/ on main triggers a build/deployment.

## Visitor paths and presentation contract

The site has four goals: (1) help a first-time developer install and run a published library API, (2) make capability-to-usage guidance discoverable, (3) explain independently owned product and infrastructure boundaries without implying a Kernel server, and (4) distinguish verified published artifacts from candidate source. Read the capability explorer as **published v0.3.2**, and the feature-preview section as **v0.4.0 candidate, NOT yet published**. Do not change `src/data.mjs` `version`, `commit` or `releaseRun` until the new public Maven Central/GitHub release has actually been verified.

The presentation control uses native buttons, keyboard arrows and Escape; a skip-to-content link supports keyboard users. The guided adoption path selector uses pressed buttons and an announced content region; focus remains on the chosen button. Flow Studio supports keyboard step controls and a reduced-motion rendering. Labels, reading order, focus visibility and 390 px reflow are checked in browser smoke where possible. Real screen reader/zoom/browser testing is still a manual QA requirement; CI is not WCAG certification.

## Architecture content boundaries

Applications retain authoritative domain data and authorization. IAM or a supported external IdP authenticates and supplies a trusted identity projection; File Storage owns bytes and grants; transport and telemetry are application-chosen. The Kernel is an embedded library with optional product-owned JDBC and test-only fixtures. No mandatory shared runtime or inter-product database. The v0.4.0 candidate adds tenantless factory/configurable mapper APIs and stricter validation, but requires a separate publication decision. Source change links go to reviewed PRs, while published source links stay pinned to the v0.3.2 tag/commit.

## Flow Studio

The Flow Studio displays illustrative, step-driven request, transaction, event and observability sequences with animated graph connections, playback, timeline scrubbing and source-linked inspection. These are not production benchmark or live service results. The capability data links to a verified release commit, not the moving main branch. Update src/data.mjs and src/flow-data.mjs when the kernel changes. Do not put private project documents, credentials, internal tenant data or secrets into this public website.
