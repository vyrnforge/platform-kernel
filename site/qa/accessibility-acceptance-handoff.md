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
