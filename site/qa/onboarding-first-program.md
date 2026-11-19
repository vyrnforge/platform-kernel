# Published first-Java onboarding — issue #78

**Scope:** Published `io.github.vyrnforge:platform-kernel:0.3.2` and the website's existing Home → Documentation install → first Java program path. The site is the developer-facing guide. `v0.4.0` remains **unpublished** and is excluded.

## Automated proof

Exact source of truth: `site/src/docs-data.mjs` (`install.samples` and `first.samples`). New focused `site/scripts/verify-onboarding.mjs` on GitHub Actions:

1. Install a JDK 21, Node 22 and Gradle 8.14.3 on a clean GitHub-hosted runner.
2. Fetch the immutable **0.3.2** core JAR anonymously over HTTPS from Maven Central's canonical `repo.maven.apache.org` host; reject non-2xx/unexpected redirects, verify SHA-1 against repository metadata, calculate and record SHA-256 and byte size.
3. Save the complete on-site Java program as `FirstKernelProgram.java`, compile with `javac --release 21` against that downloaded JAR, run and assert **exactly two canonical lowercase UUIDv7** outputs (third UUID block begins with `7`).
4. Create isolated minimal Maven and Gradle Kotlin DSL Java 21 consumers, incorporating the site's **actual** dependency fragments; compile the same Java file from Maven Central with no local Kernel source, private registry or release credentials.
5. Record exact PR head, workflow run, JDK/tool versions, SHA-256 and proof status in the issue before marking build acceptance complete.

This does not certify runtime IAM, JDBC, File Storage, enterprise consumer conformance or a release. The normal Pages Node/build/Chromium checks and required scoped checks remain intact.

**Local environment limitation (17 Nov 2026):** OpenJDK 21 and `javac` are available, but Maven/Gradle are not installed locally and DNS resolution for `repo.maven.apache.org` fails. Thus no anonymous Central binary or digest was validated locally; the scoped GitHub Actions proof is the independent networked verification path. Do not claim the artifact digest is checked unless its workflow has passed.

## Website implementation

The published install guide explicitly distinguishes Maven POM dependency fragments from a complete project and Gradle Kotlin DSL from an automatically created build file. The first-program guide retains the complete class and shows independent **macOS/Linux shell** and **Windows PowerShell** download/compile/run commands. It also explains exactly what two printed UUIDv7 values mean; build/JDK, DNS, classpath separator, file naming and wrong-release troubleshooting are in the guide rather than extra GitHub Markdown.

## Manual first-user tasks (not yet observed)

| Task | Expected result | Failure/recovery path to record | Evidence |
| --- | --- | --- | --- |
| Home → correct artifact | Identify `platform-kernel:0.3.2` without adding optional JDBC/testkit | Confusion about group vs Java package, published/candidate status | Real first-user session pending |
| Existing Maven/Gradle project | Add correct fragment, resolve and compile | No Java plugin or wrong JDK; find targeted fix | CI artifact proof plus human task pending |
| Standalone Unix | Save `FirstKernelProgram.java`, choose Run, use curl, compile, run | Missing curl/javac, DNS, colon classpath | CI CLI proof plus macOS/Linux human task pending |
| Standalone Windows | Save same class, choose Windows, use PowerShell, compile, run | PowerShell curl alias, semicolon classpath, file extensions | Human Windows PowerShell verification pending |
| Code copy | Keyboard choose tabs/copy with success/permission denied | Live feedback, manual-select fallback, focus return | Chromium smoke partial; NVDA/VoiceOver pending |
| Next integration | Recognize application-owned identity and authorization | Accidentally trusting synthetic verifier or unpublished 0.4.0 factory | Human task pending |

Record for at least two independent Java-developer sessions if available: `participant familiarity | OS/browser/JDK | start time | first-dependency time | first-success time | first error | fix tried | task completed | evidence | reviewer`. **No unobserved task time or success percentages are asserted.**

## Acceptance and close conditions

- [ ] Exact-head independent Central/Java/Maven/Gradle workflow passes and SHA-256 is recorded.
- [ ] Pages Node/build/Chromium and required CI status pass without triggering unrelated PostgreSQL/release staging.
- [ ] Windows PowerShell tested on a Windows JDK 21 machine; no Windows run falsely marked automated from Linux.
- [ ] Two new/developer usability sessions completed, or responsible owner explicitly accepts the recruiting gap with proxy evidence.
- [ ] Issue #78 explicitly records outstanding gaps and owner disposition before closure. No source API change or 0.4.0 publication.

## Wizard first-result handoff and Windows automation follow-up — 19 November 2026

**Owner direction:** improve the existing unified Playground wizard's real library adoption rather than add another UI surface. Issue #78 already had independent **Linux JDK21 + anonymous Maven Central + Maven/Gradle** proof in successful GitHub workflow [#44112346790](https://github.com/vyrnforge/platform-kernel/actions/runs/44112346790). That proof is retained, not rebranded or rerun as a new capability.

In the existing wizard **IDs & contracts → Implement** step, use the same `developerGuides.first.samples` already published and CI-verified for:
- `pom.xml` dependency **fragment** (inside an existing project's `<dependencies>`).
- `FirstKernelProgram.java` **complete Java 21 program**, not a partial application.
- Exact **macOS/Linux** shell commands downloading published JAR, compiling and running.
- Exact **Windows PowerShell** commands with semicolon classpath separator.
- Explicit expected two canonical lowercase UUIDv7 lines, JDK prerequisite and troubleshooting link to on-site Docs → First Program.

Every other capability retains its own relevant integration **excerpt requiring application ports**, or a contract-only Maven fragment. No false claim that the browser itself executes Java, IAM, JDBC, File Storage or tests.

**New Windows proof:** `site/scripts/verify-onboarding-windows.mjs` must run **on a real GitHub-hosted Windows OS** with Temurin JDK21 and Node22. It writes the Java 21 and PowerShell samples verbatim from the published docs source, runs the PowerShell sequence (anonymous Maven Central HTTPS download, javac and java), requires exactly two canonical UUIDv7 lines, and asserts the known published 0.3.2 core JAR SHA-256 `88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e`. This is automated Windows environment evidence, **not** a manually observed unfamiliar-developer session. Do not mark it passed until the workflow succeeds on the exact PR head.

**Scope:** No Java code/API/JAR/new dependency runtime, no v0.4.0 changes, no duplicate demo framework. Site wizard, existing browser assertions, focused onboarding QA and existing onboarding workflow only. Real screen-reader, browser 200%/400% zoom, manual keyboard/clipboard checks and two unfamiliar developer onboarding sessions remain OPEN under #77/#78; downstream IAM/File Storage actual consumers remain #41.
