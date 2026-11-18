# Documentation reading-flow improvement — UX epic #76

**Status:** Focused website-only proposal. Source baseline is deployed main `be859e9adb44a736470aaf028e274a6a6d8c7b87` after owner-approved PR #92. Published Java v0.3.2 and unpublished v0.4.0 candidate are unchanged.

## Source-observed problem and minimal change

The existing five task-based developer guides provide guide-to-guide navigation, contextual search and a previous/next pager. Their `request`, `jdbc` and `assure` articles each contain specialized decisions, recovery/conformance and sample code after long prerequisite/step sections. Existing validated URLs such as `#/docs/jdbc?section=recovery` work, but the articles do not expose these in a local "In this guide" navigation. A developer arriving directly via the guide entry must scroll or use search to discover a later section.

**Proposed replacement:** add one compact, scrollable **In this guide** link row to those three longer articles, using the **existing** validated `section=` hash routes and visible existing headings, native disclosure and current focus management. Do not add the row to shorter `install` and `first` guides. No sticky panel, extra sidebar, search index, new page or altered technical content.

| Guide | In-article targets | Expected state on activation |
| --- | --- | --- |
| Trusted request | Prerequisite, Steps, Choose scope, Failure & recovery, Example, Verify, Ownership | URL route updates; matching heading receives keyboard focus; current link uses `aria-current=location` |
| Optional JDBC | Prerequisite, Steps, Decision outcomes, Recovery cases, Example, Troubleshooting, Verify | Native recovery or troubleshooting disclosure opens when routed; its summary is focused for recovery |
| Consumer assurance | Prerequisite, Test steps, Conformance checks, Testkit example, Verify, Ownership | Focus lands on conformance heading or other existing section; no fabricated product test result |

## Automated/browser acceptance

1. An existing Docs Chromium smoke confirms each long guide has the expected 7/7/6 link targets, the "Sections in this guide" navigation name, and shorter guides have **no redundant local menu**.
2. A real native hash link from the Request guide jumps to the denial table and focuses its existing heading; browser Back restores guide overview and Forward restores the section.
3. A JDBC recovery link opens the existing native disclosure, focuses its summary and does not append a new learning route or duplicate the Playground.
4. Consumer Assurance jump focuses the existing conformance matrix.
5. At simulated 320/390/640 CSS-pixel widths, the small section row scrolls locally, focus reveals later links and no page-level horizontal overflow appears. Existing scrollable code and tables remain intact.
6. Existing Pages Node/esbuild, full 27 route/383 control/313 internal-link semantics, CodeQL, scoped CI and dependency review must pass on the **exact PR head**.

## Manual acceptance remains open

Actual screen-reader focus/announcement on NVDA+Chrome and VoiceOver+Safari; physical keyboard and 200%/400% browser zoom; newcomer time to find a failure/recovery/conformance section; live visual review after a future approved deployment. A correct Chromium hash/focus test is not WCAG certification or real-user usability evidence.

**Ownership:** UX defines reading-flow intent, Frontend owns the minimal React/CSS implementation, QA owns real user and assistive-technology acceptance, and shared UI Library ownership is unchanged. Consumer IAM/JDBC authority and release governance remain separate; issue #41 remains product conformance owner. Owner approval is required before merging or deploying this branch.
