# Website quality gates — UX issue #83

**Status:** Source-based and automated browser/deployment evidence; not accessibility certification, and not enterprise product consumer acceptance. Baseline: published Java v0.3.2 and website main commit `00ae563a59013c953b4386e864061604230c74b6`. Unpublished PR #65 (v0.4.0) remains untouched.

## Repeatable checks

| Check | Exact reproduction | Evidence / boundary |
| --- | --- | --- |
| Site source/build | `cd site && npm ci && npm test && npm run build` | Node guide, route, version tests; production esbuild |
| Source links and release state | `cd site && node scripts/site-quality.mjs` | Verifies local cross-file Markdown links and website hash routes, published vs candidate state, inventory of external hostnames without requesting them |
| Production browser | `cd site && node scripts/browser-smoke.mjs` | Headless Chromium; four destinations, all published guides, preview, Reference topics, each allowed Playground scenario, invalid links, focus, reduced motion, representative contrast, full-page horizontal overflow, copy feedback and semantic controls |
| Asset sizes | `node scripts/site-quality.mjs` after build | Reports raw/gzipped app.js, app.css and index.html, SHA-256 and baseline; record exact-head CI output. **Initial budget advisory only** until baseline is measured and approved |
| Post-deploy public provenance | On main only, after successful GitHub Pages deploy: `node site/scripts/verify-deployment.mjs <pages_url> <js_sha256> <css_sha256>` | Fetches public HTTPS index/JS/CSS, retries boundedly, compares exact asset bytes (SHA-256) against same-run build. Fails if public deployment cannot be independently confirmed |
| Scoped workflows | Required CI and security checks remain fail-closed | Pure site changes do not run full Java/PostgreSQL/release staging; Java source/release boundaries unchanged |

## Initial measured build baseline — advisory, not a signed-off performance budget

Captured on the **passing** [GitHub Pages Chromium workflow #44251094273](https://github.com/vyrnforge/platform-kernel/actions/runs/44251094273) at PR head `2adbe4273b629c2524b5f1f5260b6e8ae8f201ce` (18 November 2026), on a GitHub-hosted Ubuntu runner using the production esbuild bundle.

| Asset | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| app.js | 336,570 | 100,398 |
| app.css | 39,842 | 9,209 |
| index.html | 951 | 543 |

Chromium inspected **27** supported routes/states, **383** controls and **313** rendered internal links, with zero failures after remediation. Source link inventory checked **14** Markdown-local links and listed **3** external hostnames without live availability assertions. The one local headless browser capture reported **124 DOM nodes**, **3** resource entries and **166 ms** navigation DOMContentLoaded/load; these are **CI harness observations, not real-user latency or Core Web Vitals**. Hard budgets stay advisory until Product/QA ratify variance margins and maintainers explicitly add an accepted `site/qa/performance-baseline.json`.

## Current fact versus pending evidence

- **Source-confirmed:** Original Pages pipeline built and ran Chromium on pull requests and automatically deployed main, but did not prove the exact public site content after deployment. Browser smoke checked selected states, not every supported Playground case. No full axe/Lighthouse dependency or audited performance budget was present.
- **Implemented:** A dependency-free route/link/build snapshot, expanded Chromium semantic and route matrix, reduced-motion check, and exact deployed JS/CSS digest verification. Browser checks are automated proxies and are NOT a full accessibility scanner.
- **Performance policy:** Initial CI must report measured gzip sizes, DOM/resources and navigation timings. Review observed baseline with Product/Frontend/QA before setting hard limits; never invent a performance improvement, Core Web Vitals result, or user-experience timing from build bytes alone. Any future reviewed threshold belongs in `site/qa/performance-baseline.json` and will be enforced by `site-quality.mjs`. This choice deliberately avoids an arbitrary budget and new dependency.
- **External links:** Host inventory is advisory. Do not make third-party outages hard PR failures without a controlled reliability policy. Internal routes and repository-local file links are strict.
- **Production verification:** PR deployment is still skipped. Main's post-deploy check cannot actually execute in an unmerged PR; its first real evidence comes from a future owner-approved merge.

## Manual test matrix (OPEN)

| Task | How to test / expected outcome | Actual status |
| --- | --- | --- |
| Real zoom | Chrome/Firefox at actual 200% and 400% zoom across Home, Docs/code, Playground and Reference; no obscured focus, trapped horizontal overflow or clipped controls | **Not performed** |
| Screen reader | NVDA+Chrome Windows and VoiceOver+Safari macOS/iOS; verify announcement count, labels, stage state, search/copy feedback and recovery | **Not performed** |
| Keyboard | Chrome and Firefox keyboard-only, long code scrolling, expanded disclosure and focused heading after route change | **Not performed as independent human session** |
| Reduced motion | OS-level reduced-motion preference, no distracting motion; Chromium emulation is only partial evidence | **Manual pending** |
| Production visual | Inspect actually deployed Pages after merge on desktop/mobile, link to deployment run and screenshots | **Not performed** |
| Real user onboarding | New Java developer finds dependency, first program, authorization and JDBC source from on-site guides; record first failure/time without guessed percentages | **Not performed** |
| Real product adoption | IAM/IdP, product SQL, PostgreSQL recovery, audit/event outbox and tenancy negative-isolation conformance (issue #41) | **Separate acceptance, not performed here** |

**Record:** `scenario | source SHA | CI/deployment run ID | URL/hash | OS/browser/AT | viewport & actual zoom | steps | expected focus/state/route | observed first failure | severity | owner | fix/retest evidence`.

**Guardrails:** WCAG 2.2 AA is a proposed quality target, not a certification. QA owns human acceptance. Frontend owns the existing React/esbuild website and built-in Node/Chromium tests. DX/CI owns provenance and performance policy. No Java API, Maven artifact, database, migration, IAM, File Storage, framework, extra Playground or v0.4.0 release changes are authorized.
