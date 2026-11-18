# Playground interaction and accessibility — issue #82

**Status:** Website source review and focused browser automation, not human AT certification or live Kernel execution. **Published source:** v0.3.2, source commit `c86eb33a46fae2843c75181c6b395cd0dc6710fe`. **Website baseline:** protected main merge `9179bd7c58fdb94c2d45ce3c55a6cd206b3c8492`. Applicable Constitution, Architecture, API/Events, Security/NFR and Decision Log were consulted before implementation.

## Confirmed source observations and minimal replacement

| ID | Source observation | Replacement/retained pattern | Verification |
| --- | --- | --- | --- |
| P01 | Entire multi-paragraph `.wb-inspection` was `aria-live=polite`, and separate badge `.wb-outcome` had `role=status`. Stage and scenario changes could cause redundant/long announcements. Actual AT repetition frequency is **not observed**. | Remove inspector live region and badge status role. Add one short, atomic `role=status` announcing selected pattern, scenario, outcome and current stage/status. Keep inspector an ordinary labeled `section`, available to AT by normal navigation. Clipboard has its own independent status only when used. | Static/Chromium single-status semantics; NVDA+Chrome and VoiceOver+Safari **manual pending** |
| P02 | `useEffect` reset the active step *after* route changes. The inspector could briefly show the old step for a new scenario before resetting. | Derive first selected stage synchronously from a unique browser-history visit ID (not the reusable scenario string); local stage choice remains local, URL remains source for scenario. Back/Forward to a previous URL also resets to stage 1 without remounting controls. | Browser Back/Forward, route switch, inspector status |
| P03 | Unknown mode, unsupported endpoint scope or unavailable scenario silently defaulted to a supported trace with no explanation. | Retain existing safe core/scoped/success fallbacks and display a static, reasoned recovery message for malformed/unavailable shared links. Do not invent a simulation of an unsupported scenario. | Route unit test and Chromium invalid-link check |
| P04 | Native buttons, checkbox, `aria-pressed`, `aria-current=step`, explicit state text and local scrollable code were already implemented. | Preserve them, add `aria-controls` to stage navigation and a labeled inspector heading, preserve deliberate focus on input controls; no new control, flow or dependency. | Existing plus focused browser smoke; manual AT pending |

## Retest script

| Journey | Test steps | Expected state / focus and recovery | Evidence status |
| --- | --- | --- | --- |
| A | Deep link to tenant-scoped membership denial, Tab through mode/scope/scenario and all decision buttons, press Enter on third gate | Selected gate shows Stopped here, `aria-current=step`, inspector is readable separately, concise one-time scenario/stage status. Focus remains on invoked button | Headless Chromium test, actual NVDA+Chrome manual pending |
| B | From a failed gate change scenario to success using keyboard | New route immediately resets to gate 1, current mode/scenario/outcome announced once, focus stays on scenario control | Headless Chromium test; AT announcement count manual pending |
| C | Navigate Back and Forward across scenario changes | URL, outcome, selected first gate and follow-up links are valid. No stale stage is shown | Headless Chromium test |
| D | Open invalid request: tenantless membership denial; open unknown mode/scope URL | Valid supported scenario selected and correction visible, without claiming invalid live Kernel action | Route Node and Chromium tests |
| E | Use Previous/Next, change code tab, check optional testkit, copy code (allow/deny), read guide | Native buttons/checkbox and text statuses; code scrollable; clipboard denied gives manual select guidance and guide stays on-site | Existing Chromium smoke plus new clipboard feedback check; denied-permission and AT manual pending |
| F | Inspect passed, blocked, skipped, not-reached stage states across tenantless/request/JDBC | Distinct labels in text; no color-only cue or false claim that `Not required` equals `Not reached` | Existing source and contract tests |
| G | At 320/390/640/720 and 1440/1920/2560 widths navigate Playground and code pane | No page-level horizontal overflow, code owns its own scroll; ordered DOM reading remains intact | Existing Chromium emulation; **actual browser 200%/400% zoom** manual pending |
| H | Real production consumer, tenant validation and idempotency | **Not executable in Playground**; test separately in product and issue #41 | Product acceptance pending |

## Human QA evidence protocol

Run Chrome/Firefox keyboard-only, NVDA+Chrome, VoiceOver+Safari and actual browser zoom at 200%/400%; independently record any repeated announcements, focus loss, reading order, code scroll trap and error recovery. Capture `scenario URL | OS/browser/AT | actual zoom | input step | expected focus/status | observed announcement | first failure | fix | retest | reviewer`. For user learning outcomes, observe at least one unfamiliar Java developer following the Playground into the real on-site guide and comparing simulation versus actual consumer responsibilities. Do not claim a measured success rate without observed sessions.

**Boundaries:** one existing simulated Playground, no server, identity verifier, JDBC transaction or extra scenario. Core, optional JDBC and testkit remain v0.3.2; preview v0.4.0 PR #65 is unpublished. This work neither certifies WCAG 2.2 AA nor closes real product consumer conformance (#41). Owner approval required before merge/deploy. Issue #82 stays open for outstanding manual QA until owner disposition.
