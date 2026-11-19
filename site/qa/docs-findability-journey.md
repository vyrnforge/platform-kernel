# UX #81 — Documentation findability, navigation and release-state evidence

**Scope:** Existing Home, Documentation, one Playground and Reference on the React/esbuild website; released Java library **v0.3.2**, separately reviewed/unpublished **v0.4.0**. No new site destination, library APIs, Maven artifacts, deployment or release action.

**Source baseline:** protected main merge `4181c153602beb3c043ac669af929c9d5b052b0c` (PR #87); project Constitution, Architecture/Domain Boundaries, API/Events, Security/NFR and Decision Log reviewed. This matrix describes source-observed behavior and automated test intents; **manual usability, assistive technology and actual browser 200%/400% zoom were not performed**.

## Findings and replacement decisions

| ID | Confirmed source observation | Existing element replaced or refined | Target result / owner |
| --- | --- | --- | --- |
| UX81-F01 | Sidebar search filters complete guides but gives no matching passage or target section | Refine `searchDeveloperGuides` with one best matching section/result per guide; show label and text snippet, use validated hash query/section/sample arguments | Frontend: click result → correct guide passage, active state and keyboard focus; QA: Back/Forward |
| UX81-F02 | Prior direct guide routes focus only the guide heading | Focus a real existing heading/summary for selected section, open disclosure for linked troubleshooting/recovery, select a matching code tab | UX/Frontend: no new page or duplicate search; QA: keyboard/source/route checks |
| UX81-F03 | Root README calls the website "Flow Studio" and links users to repository markdown integration guides | Correct website name and route integration guides to the canonical on-site Home/Docs/Playground/Reference | Docs: `docs/` remains maintained contract/operations provenance, not a second website manual |
| UX81-F04 | Private npm site package version `0.3.1` could be mistaken for published Java v0.3.2 | Set private site package + lock metadata to a fixed `0.0.0` build placeholder; continue to derive UI release labels from `site/src/data.mjs` | Release/DX: npm metadata never authorizes Maven release |
| UX81-F05 | `<noscript>` fallback links to GitHub integration-guide tree | Clarify intentional static README fallback and JS requirement without maintaining another guide catalog | UX/Docs: clearly available support path if JS is disabled |
| UX81-F06 | v0.4.0 preview is already marked not released | Preserve and verify existing status separation and published default v0.3.2 source/example pins | Release owner: no automatic candidate merge or publication |

## Task / state acceptance

| Task | Expected interaction and recovery | Automated evidence | Manual outstanding |
| --- | --- | --- | --- |
| S01 Search `classpath separator` | One matching first-program guide, labeled **Troubleshooting**, highlighted by focused summary; disclosure opens and existing search text remains available | Node match+route, Chromium controlled search, focus and disclosure | Real newcomer and screen-reader |
| S02 Search `TENANT_CONTEXT_MISMATCH` | Navigate to request failure table, focus its heading, preserve filter in URL for Back/Forward | Node and Chromium | NVDA/VoiceOver reading order |
| S03 Search `Invoke-WebRequest` | Deep link to first-program example with Windows PowerShell tab selected | Node and Chromium | Windows PowerShell human task remains #78 |
| S04 Navigate Back/Forward | Section and text search return to the same meaningful source context; invalid section/sample fall back safely | Node and Chromium | Real Firefox/assistive tech |
| S05 Release navigation | Published v0.3.2 dependency remains installable; candidate v0.4.0 preview is **NOT RELEASED**, not silently promoted by changing npm version | Node route/version tests and existing Chromium preview check | Human release comprehension |
| S06 No JS | JS-required message offers a static README fallback; no parallel full guide source | Source check | Manual browser JS-disabled test |
| S07 All destinations and breakpoints | Four primary routes only; no broken internal hash links, whole-page overflow or missing focus. Tables/code scroll within their surfaces | Node+headless Chromium at narrow/desktop viewports | Actual 200%/400% zoom and screen readers |

## QA retest record

`Task | source/head SHA | route and query | browser/OS/AT | viewport/actual zoom | input | expected focus and visible context | observed first failure | ownership | fix/retest evidence | human acceptance`.

**Automated:** existing change-scoped Pages Node/esbuild/Chromium and required verify/CodeQL/dependency review must pass at the PR's exact head. New tests check context snippet and section mapping, supported hash query values, default fallback, sample selection and internal route resolution.

**Not yet observed:** two new/returning-user sessions, real Windows/Firefox keyboard journeys, screen-reader announcements, no-JS fallback in a human browser, actual 200%/400% browser zoom, complete contrast/pointer audit. Do not claim WCAG 2.2 AA conformance or completed UX outcomes. UX owns journey specification; Frontend owns the site implementation; QA owns evidence. Any shared-library component issue goes to Shared UI Library, not into Kernel runtime.

**Release policy:** v0.4.0 PR #65 remains draft/unmerged/unpublished. Publication requires a separate release approval and verified artifacts; then a future reviewed documentation cutover may update the published source/version, not before.

## Post-merge Pages keyboard-search flake — 19 November 2026

**Observed:** PR #103 passed its exact-head Pages/Chromium, Node, scoped CI, CodeQL, dependency review and Linux/Windows published-consumer workflows. After owner-approved merge into main at \`91a6b8c40564abc8ebb022d36ddabc6a37928ee8\`, main Pages run [#44448497302](https://github.com/vyrnforge/platform-kernel/actions/runs/44448497302) attempt 1 failed the Docs search-reset *test harness*: the scripted \`.docs-search-empty button\` was present during a preceding polling step but null by the next Chrome DevTools \`Runtime.evaluate\` call, causing a test-only TypeError before a keyboard event could be delivered. All 26 Node tests passed. This is an observed cross-evaluation React remount/timing race in the automated test, not evidence of a real keyboard, search or screen-reader product failure.

A same-head GitHub re-run was explicitly requested and must be reported separately with its result before claiming public deployment. **Follow-up QA rule:** set a nonmatching query, poll for that exact input value and a connected empty-result reset button, atomically focus the current button inside the polling expression, send Enter through Chromium keyboard events, and assert all five guides plus focus returned to search. Repeat with a second query to exercise the remount transition twice. Preserve the real semantic keyboard path—do not replace Enter with a programmatic click or waive the focus assertion. Keep actual Firefox/AT/zoom acceptance **OPEN**, and do not claim that passing an additional headless run proves real-device behavior.
