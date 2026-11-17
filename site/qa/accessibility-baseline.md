# Accessibility baseline — UX issue #77

**Status:** Initial source-based audit and automated browser checks; **not a WCAG conformance statement**.  
**Baseline:** `main` at `a5a8827ba63ddc3ca82d794c9b273461858b29b4` (17 November 2026).  
**Target:** WCAG 2.2 Level AA is **proposed** for Product/QA adoption; formal acceptance and complete audit are pending.  
**Scope:** The four existing destinations (Home, Documentation, single Playground, Reference), published v0.3.2 and explicitly unpublished v0.4.0 preview.

## Evidence categories and severity

- **SOURCE:** The behavior or styling is directly visible in the named source revision; it is not necessarily reproduced with a user or assistive technology.
- **AUTOMATED:** A specific exact-head production-bundle Chromium regression has passed; record the workflow link in PR #77. The script does not measure screen-reader user experience.
- **MANUAL PENDING:** Evidence does not exist. Never present this as passed or as an established user-impact rate.
- For any failure, record *the first blocked step*, expected vs actual, user input mode, browser/OS/AT/zoom, severity, owner, fix, exact retest and evidence link.

P0 = essential journey or release/security state unachievable; P1 = keyboard, focus, contrast or recovery significantly impaired; P2 = secondary polish/comfort. Confirm severity with actual reproduction, not assumptions.

## Initial findings and targeted remediations

| ID | State and source evidence | Expected interaction | Action / retest | Evidence |
| --- | --- | --- | --- | --- |
| UX77-F01 | `DeveloperDocs.jsx`: clearing an empty search unmounts its button; no explicit target for focus. | On activating **Clear search**, restore guide list and transfer focus to the persistent search input, including Enter from keyboard. | Focus `#guide-search` before reset; check DOM activeElement and restored results in Chromium; retest with NVDA/VoiceOver. | SOURCE; automated regression added; AT pending |
| UX77-F02 | Small-text CSS includes `#8aa2c0` on white (2.62:1), `#7085a0` on white (3.78:1), `#667f98` on white (4.16:1) and `#6b7d91` on white (4.23:1). | Normal-sized text reaches at least 4.5:1 under the **proposed** AA target unless a documented exception applies. | Change relevant small-text selectors to `#52677e` (~5.83:1 on white); check actual computed foreground/background for representative Docs, Reference and Playground elements in Chromium. Non-text contrast and all remaining elements still need a wider audit. | SOURCE contrast arithmetic; targeted browser regression added; full review pending |
| UX77-F03 | `Reference.jsx` uses `<details><summary>`; previous smoke only clicked it. | Details open and close with Enter/Space, remain in logical reading order and expose expanded state. | Press Space while focused on `summary`, assert changed `open` state; manual AT retest. | SOURCE; automated regression added; AT pending |
| UX77-F04 | `main.jsx` focuses route heading; `NotFound` has a recovery link. | Unknown deep link is understandable and recoverable without pointer; restored guide heading receives focus. | Keyboard Enter on recovery link and assert focus on guide heading. | SOURCE; automated regression added; AT pending |
| UX77-F05 | `IntegrationWorkbench.jsx` has native buttons, `aria-pressed`, outcome `role=status`, inspector `aria-live=polite`. | Single useful announcement per changed decision; no announcement flood or unexpected focus displacement. | Real screen-reader task on scenario switch, denied stage and Previous/Next; coordinate source changes with [#82](https://github.com/vyrnforge/platform-kernel/issues/82). | MANUAL PENDING |
| UX77-F06 | Existing browser smoke checks narrow *viewports*, not actual zoom. | At real 200% and 400% browser zoom, headings, sticky navigation, focused controls, text and local code/table scrollers remain usable. | Manual zoom tests on Chrome/Firefox; no false claim from emulation. | MANUAL PENDING |
| UX77-F07 | Code copy provides live status and fallback text; clipboard-denied keyboard path not directly tested with AT. | Success/failure is perceivable and code can still be copied without a mouse. | Deny clipboard permission and complete the code task with keyboard; share practical follow-up with [#78](https://github.com/vyrnforge/platform-kernel/issues/78). | MANUAL PENDING |
| UX77-F08 | `site/index.html` `noscript` fallback points to GitHub Markdown. | A no-JavaScript reader has a clear support path consistent with website-first guide ownership. | Evaluate fallback policy under [#81](https://github.com/vyrnforge/platform-kernel/issues/81). Do not create duplicate documentation. | SOURCE; acceptance undecided |

## Manual task / state matrix

Every listed script requires at least one keyboard-only session; screen-reader cases remain unverified until recorded with the actual browser and AT.

| Script | Route / environment | Steps, expected names/states and recovery | Pending evidence |
| --- | --- | --- | --- |
| T01 — quickstart | Home `#/`; Chrome and Firefox desktop/mobile widths | Keyboard-only Tab to skip link and first CTA, Enter into install; Home/guide heading and published v0.3.2 context announced. Record lost focus or failure to activate and recover using Documentation nav. | Keyboard-only Chrome/Firefox, NVDA/Chrome, VoiceOver/Safari |
| T02 — search empty | `#/docs/install` | Focus labeled search field, type nonsense, find "No matching guides", activate Clear search by Enter, confirm focus is back on Search, results restored and count understandable. | NVDA/Chrome, VoiceOver/Safari |
| T03 — example and clipboard | `#/docs/first` | Select Java/run tab by keyboard, focus/scroll pre, activate Copy, read copy success/denied and try manual selection. Restore published snippet if code tab changes. | Clipboard-denied Chrome, screen readers |
| T04 — authorization flow | `#/docs/request` → `#/playground?mode=request&scope=scoped&scenario=cross-tenant` | Follow on-site link, choose blocked gate, hear 404/owner, use Previous/Next and return to guide. "Not reached" and "Not required" must not be confused. | NVDA/Chrome, VoiceOver/Safari |
| T05 — Reference and preview | `#/reference/architecture` → `#/reference/releases` → `#/docs/preview` | Activate summary with Space and Enter, inspect owner sections and published-vs-unpublished status; use back/forward with stable focus. | Keyboard-only Firefox, screen readers |
| T06 — invalid route | `#/not-a-page` | Hear Page not found heading, keyboard activate Open documentation, confirm installation guide heading focused. | Keyboard-only Chrome/Firefox, screen readers |
| T07 — real zoom/reflow | All four destinations, including preview | At actual 200% and 400% zoom, repeat T01/T03/T04/T05; verify visible focus, sticky header, reading order and no whole-page textual horizontal overflow; code/table scroll internally. | Chrome/Firefox 200% and 400%; record CSS viewport vs zoom separately |
| T08 — assistive technology | T01–T06 | NVDA + Chrome/Windows and VoiceOver + Safari/macOS (and iOS where available). Record browser/AT versions, announcements, orientation and recovery. | MANUAL PENDING |

## Record template and exit criteria

`Task ID | route | source/site revision | browser/OS/AT versions | CSS viewport | actual zoom | keyboard/AT steps | expected name/role/state/focus | observed/first failure | severity | owner | fix commit | retest result/date/evidence URL`

- [ ] Product/UX/QA ratify the WCAG 2.2 AA target and any exceptions; no certification claim implied.
- [ ] Exact-head Node tests, site build and Chromium focus/contrast/route smoke pass and are linked from the issue.
- [ ] Keyboard-only Chrome and Firefox evidence captured; manual real screen-reader matrix completed or explicitly accepted as unavailable by the owner.
- [ ] Actual 200%/400% browser zoom and pointer/target/non-text contrast review completed, with observable retests.
- [ ] Any newly confirmed defects filed under parent [#76](https://github.com/vyrnforge/platform-kernel/issues/76) and assigned; component-library contract defects routed to Shared UI Library owners.
- [ ] **Do not close #77 based solely on automation**. The next work issue [#78](https://github.com/vyrnforge/platform-kernel/issues/78) can start independently while #77 retains manual acceptance gaps.

No new library APIs, Java artifacts, module registry, IAM service, backend, framework or second Playground is authorized by this baseline.
