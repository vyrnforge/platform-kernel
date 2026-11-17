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
