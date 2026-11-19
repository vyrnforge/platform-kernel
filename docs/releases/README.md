# Release operations

Current maintainer entry point. See [Central publication](central-publication.md) for the pipeline/recovery and [signing key operations](signing-key-operations.md) for key custody/rotation.

## Active workflows

| Workflow | Trigger / purpose |
| --- | --- |
| ci.yml | PRs and main; contract baseline, smoke, Maven tests, JAR and staging verification |
| codeql.yml | PRs, main, weekly; Java security analysis |
| dependency-review.yml | PRs; fail closed if dependency review cannot be performed |
| release.yml | Approved version-changing main release commit; manual main dispatch only for recovery; sign, publish Central, mirror and tag; explicit recovery record for timed-out deployments |
| pages.yml | Site changes and manual main dispatch; React tests, Chrome smoke, Pages deployment |

Dependabot covers Maven, GitHub Actions and site npm. The one-time signing bootstrap is retired. Historical run records may still appear in GitHub Actions; retain those for audit.

## Developer documentation prepared before release

- [v0.4.0 website developer preview](https://vyrnforge.github.io/platform-kernel/#/docs/preview) lives in the website source (not duplicated in this repository's release-operations folder), is prepared **before publication** and is explicitly marked **NOT RELEASED**. It documents candidate-only APIs, dependency coordinates for future use, compatibility and migration tests. The site's default installation guidance stays pinned to published v0.3.2 until v0.4.0 is independently approved and publication is verified.
- Keep pre-release developer documentation ready and reviewed *before* requesting release authorization. Publication and consumer adoption remain separate gates.

## Release checklist

Before approving a version-changing PR, require the following DOCSEC classification evidence in addition to contract compatibility and release readiness. These are **human review decisions**, not automatic release permission:

- [ ] Version-specific developer guides, migration notes and runnable examples are reviewed **before** publication; the default install still points to the latest verified released version (DEC-K033).
- [ ] A Security owner has reviewed changed source, website, docs, Javadocs and package contents under [public documentation boundaries](../security/publication-boundaries.md). Record an eligible independent approval or an **explicit scoped governance exception**, never infer it from previous releases.
- [ ] The DOCSEC source, built Pages assets and generated binary/source/Javadoc JAR checks pass at the **exact candidate SHA**; attach artifact hashes and CI links. Bounded signature scans do not certify absence of secrets.
- [ ] Confirm private internal diagrams are excluded from the repository, public site bundles, ZIP/JAR contents, workflows and logs; verify destination ACL and owners. Respect existing Apache-2.0 public source visibility and historical copies.
- [ ] Any historical exposure or manual accessibility/adopter-test gap has a documented reviewer, residual-risk disposition and owner decision. Do not self-certify independent QA.
- [ ] Obtain **separate explicit Product Owner release/merge authorization**, and preserve protected checks; this checklist does not grant it.

1. Update VERSION, all Maven module versions and changelog. Keep Java package names, released wire contracts and migration bytes compatible unless explicitly approved. Do not reuse a version.
2. Open a release PR and require all protected checks. Squash merge with a verified commit and title beginning `release:`. A version-changing main push starts the release; non-release docs do not.
3. Confirm the release builds the three binary libraries, source/Javadoc archives and four POMs, signs them and publishes to Central. Confirm public consumer resolution, byte-matched GitHub mirror and GitHub Release.
4. Update README, integration guide, website version/source links and canonical decision log using verified publication evidence. The site deployment remains separate.
5. For partial publication, follow the Central recovery runbook; do not re-upload blindly or replace existing bytes.

## Historical evidence

- [v0.2.0 checklist](archive/V2_RELEASE_CHECKLIST.md)
- [v0.2.1 hardening checklist](archive/V2_HARDENING_CHECKLIST.md)
- [v0.3.0 three-JAR release](https://github.com/vyrnforge/platform-kernel/releases/tag/v0.3.0)
