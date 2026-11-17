# Platform Kernel product showcase

A standalone React product site for the **published v0.3.2** library and a clearly labeled **unpublished v0.4.0 candidate preview**. The Java modules and Maven release pipeline are independent of this site.

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

The site has three goals: (1) help a first-time developer select the smallest useful module, (2) explain independently owned product and infrastructure boundaries without implying a Kernel server, and (3) distinguish verified published artifacts from candidate source. Read the capability explorer as **published v0.3.2**, and the feature-preview section as **v0.4.0 candidate, NOT yet published**. Do not change `src/data.mjs` `version`, `commit` or `releaseRun` until the new public Maven Central/GitHub release has actually been verified.

The presentation control uses native buttons, keyboard arrows and Escape; a skip-to-content link supports keyboard users. The guided adoption path selector uses pressed buttons and an announced content region; focus remains on the chosen button. Flow Studio supports keyboard step controls and a reduced-motion rendering. Labels, reading order, focus visibility and 390 px reflow are checked in browser smoke where possible. Real screen reader/zoom/browser testing is still a manual QA requirement; CI is not WCAG certification.

## Architecture content boundaries

Applications retain authoritative domain data and authorization. IAM or a supported external IdP authenticates and supplies a trusted identity projection; File Storage owns bytes and grants; transport and telemetry are application-chosen. The Kernel is an embedded library with optional product-owned JDBC and test-only fixtures. No mandatory shared runtime or inter-product database. The v0.4.0 candidate adds tenantless factory/configurable mapper APIs and stricter validation, but requires a separate publication decision. Source change links go to reviewed PRs, while published source links stay pinned to the v0.3.2 tag/commit.

## Flow Studio

The Flow Studio displays illustrative, step-driven request, transaction, event and observability sequences with animated graph connections, playback, timeline scrubbing and source-linked inspection. These are not production benchmark or live service results. The capability data links to a verified release commit, not the moving main branch. Update src/data.mjs and src/flow-data.mjs when the kernel changes. Do not put private project documents, credentials, internal tenant data or secrets into this public website.
