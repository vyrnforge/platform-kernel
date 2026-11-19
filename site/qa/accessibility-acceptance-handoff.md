# UX epic #76 / accessibility #77 — human acceptance handoff

**Evidence checkpoint:** 19 November 2026. **Public release:** v0.3.2. **Acceptance status:** **OPEN**. This is a reproducible manual testing protocol backed by limited automation, not a WCAG certificate.

The single website has four top-level destinations: **Home, Documentation, Playground, Reference**. The Playground now has one **Choose → Understand → Prepare → Explore → Implement** capability-specific wizard; do not use obsolete two-panel/Flow Studio test scripts.

## Automated verification — precise, limited scope

The existing Pages Chromium matrix already checks rendered DOM control names, `aria-controls`, heading presence, internal hash links, state/history and horizontal overflow. The focused [#76](https://github.com/vyrnforge/platform-kernel/issues/76) regression candidate adds Chrome DevTools `Accessibility.getFullAXTree` sampling of exposed interactive computed names, exactly one main landmark and named headings for **all matrix routes**, the wizard chooser, all five wizard steps and a contract-only FileReference step. CI records `inspectedAXControls` separately from DOM controls.

This **does not** verify spoken announcements in NVDA/VoiceOver, real browser zoom, focus order on physical hardware, target size, total WCAG 2.2 AA, actual product execution or user comprehension. Mark automated status PASS only after its exact-head GitHub Pages workflow succeeds; distinguish draft from deployed production.

## Manual task matrix — not performed

| Case | Environment and task | Expected behavior and evidence | Status |
| --- | --- | --- | --- |
| UX76-01 | Windows 11, Chrome keyboard only: Home → Documentation search `TENANT_CONTEXT_MISMATCH` → Request failure guide → Back/Forward | Tab/Shift+Tab, Enter/Space, search clear, named headings, visible focus and restored query/results; capture first failure and exact route | **OPEN** |
| UX76-02 | Windows 11, Firefox keyboard only: Home → Playground → choose Idempotency → Understand → Prepare → Explore REPLAY/CONFLICT → Implement | All five stages and scenario/decision buttons reachable; focused heading after transitions; copy available or manual selection fallback | **OPEN** |
| UX76-03 | NVDA + Chrome, Windows: choose Identity & tenancy, trigger unverified 401 and membership 403 | Spoken name/role/state and blocked-step announcements **once** without verbosity; recovery text and code handoff reachable by headings/landmarks | **OPEN** |
| UX76-04 | VoiceOver + Safari, macOS: repeat File references **contract-only** guide and Core IDs full first-run | Reading order, wizard navigation, heading/controls, refusal to imply file execution; copy/code tabs, explanation of complete vs excerpt | **OPEN** |
| UX76-05 | Actual Chrome and Firefox **200%/400% browser zoom**: all four destinations; docs search; wizard all five phases; Reference preview warning | No lost content, unreachable button, overlapping sticky header, clipped prose, trapped page-scroll; code blocks may scroll locally | **OPEN** |
| UX76-06 | Target size/spacing, contrast and OS reduced motion on actual browsers | Criterion-level exceptions and button/link sizes; focus indicator; contrast incl non-text; no unnecessary motion | **OPEN** |
| UX76-07 | Two unfamiliar Java 21 adopters: from Home find published v0.3.2; run complete `FirstKernelProgram.java` (Windows/Unix) | Observe time to result, first error, two UUIDv7 lines, ability to find correct Maven fragment and distinguish candidate v0.4.0 | **OPEN** |
| UX76-08 | Two unfamiliar Java integrators: choose request identity or JDBC, explain product-owned ports/transactions and debug simulated failure | Correct ownership and safe recovery without believing browser actually executed IAM or SQL | **OPEN** |
| UX76-09 | Docs/Reference: no-JavaScript fallback and published/preview deep links | Human can recover and understand published vs candidate status; note route/focus/back and fallback usability | **OPEN** |

**Required evidence per case:** `case ID | SHA & public Pages build | URL/hash | OS/device | browser + version | screen reader + version | actual zoom | action/expected state | observed focus/spoken/visual state | first failure/severity | anonymized screenshot/log | tester | reviewer | remediation PR and retest date`.

No personal credentials, raw bearer tokens, live customer records or sensitive identity claims should appear in captured evidence.

## Closure discipline

- Record observed failures as scoped child issues with reproducible route/browser/version and confirmed behavior; fix only evidence-backed defects.
- Human UX/QA owner signs off or explicitly defers each case with justification. **Do not** mark unchecked rows PASSED from source code, viewport emulation, the AX tree or GitHub Pages deployment success.
- Keep [#77](https://github.com/vyrnforge/platform-kernel/issues/77) and parent [#76](https://github.com/vyrnforge/platform-kernel/issues/76) open until manual acceptance or explicit owner disposition. Independent product IAM/File Storage acceptance belongs to [#41](https://github.com/vyrnforge/platform-kernel/issues/41), and KDX code/release review to [#54](https://github.com/vyrnforge/platform-kernel/issues/54).
- This procedure introduces **no** new website, Java runtime code, simulator, third-party framework or shared UI component. Continue to use the published v0.3.2 docs; preview v0.4.0 remains non-installable.

## Keyboard fallback for denied clipboard permissions — implementation candidate

**Observed source gap:** the published Docs and five-step Playground showed status text telling a developer to manually select the sample after `navigator.clipboard.writeText` was blocked, but offered no explicit *whole-sample* selection action. Long, syntax-highlighted Java and PowerShell snippets could be difficult to select reliably by keyboard, especially when horizontally scrollable.

**Scoped interaction:** Both existing code panels now provide `Copy code` and `Select code`. The selection action focuses the `pre[tabindex="0"]`, creates a native `Range` over its complete syntax-highlighted `code`, and reports **Ctrl+C / Command+C** instructions in one accessible status. A denied asynchronous copy automatically performs the same selection and reports the reason. The original `code` text and tabs are not changed; no insecure programmatic clipboard bypass is attempted.

**Automated acceptance:** Chromium injects a rejected `navigator.clipboard.writeText`, invokes Copy code in both Docs and the Playground, and asserts the **actual native browser selection** equals the rendered code text with keyboard focus on the scrollable `pre`. It also activates Docs' Select code via a genuine Enter key event and verifies selection/status. Device-width reflow, four destinations, AX accessible names and link checks remain part of the Pages suite.

**Manual acceptance still OPEN:** A tester must deny clipboard permission in an actual Windows/Linux/macOS browser and use the built-in Copy/Select code action followed by Ctrl+C/Command+C in a real editor, including true 200%/400% zoom, Firefox keyboard-only, NVDA+Chrome and VoiceOver+Safari. Capture user focus, spoken status, whether the selected code pastes completely, first failure and exact build. Headless automation is not a human clipboard/AT acceptance or WCAG 2.2 AA certification.

## Confirmed browser-rendered section-focus occlusion — 19 November 2026

**Production artifact inspected:** exact JavaScript/CSS bytes from merged Pages run [#44449298765](https://github.com/vyrnforge/platform-kernel/actions/runs/44449298765), main `11fb3fc9bd397e0a73048d13624b6ae3e6cc9c4b`, loaded into local Chromium for geometry checks (not a real device/assistive technology session). This is a confirmed observable front-of-page focus defect, beyond a source-level hypothesis.

When navigating to `#/docs/request?section=failures` and `#/docs/jdbc?section=troubleshooting` at simulated 320/390/720 CSS-pixel widths, the focused heading or summary aligned at about 130/130/110px from the top. The wrapping sticky site header was about 144/107/111px high, and `elementFromPoint` at the visible focus target also returned the Docs sticky sidebar/search overlay at these sizes. The underlying cause: common `.reference-aside,.docs-sidebar{position:sticky}` in the bundle overrode an earlier narrower Docs stylesheet `position:static` declaration in the mobile single-column layout. Thus route-focus-only and page-overflow tests were insufficient.

**Proposed narrowly scoped regression fix:** Force the Docs sidebar to `position:static` below its 870px grid-stack breakpoint using a selector that wins after bundling, and give in-guide heading/summary `scroll-margin-top` 145px at ≤870px / 175px at ≤360px. In a local exact-artifact Chromium CSS-patch retest, at 320 CSS px focused targets moved to 175px below the 144px sticky header and became frontmost instead of the search input; at 390 and 720px, the targets moved to ~145px below 107/111px headers. No page-level horizontal overflow was observed in the sampled routes. Add required Chromium assertions for both deep links across 320/390/640/720px: correct active target, static Docs sidebar, at least 12px space below header, topmost focus target at its inspection point, and no page-level overflow.

**Human testing remains open:** These samples use headless Chromium metric emulation, not native Firefox keyboard input, NVDA/VoiceOver speech, real 200%/400% browser zoom, or an independently observed physical device. Do not mark WCAG criteria or any manual acceptance as passed based solely on this fix.
