# Release operations

Current maintainer entry point. See [Central publication](central-publication.md) for the pipeline/recovery and [signing key operations](signing-key-operations.md) for key custody/rotation.

## Active workflows

| Workflow | Trigger / purpose |
| --- | --- |
| ci.yml | PRs and main; contract baseline, smoke, Maven tests, JAR and staging verification |
| codeql.yml | PRs, main, weekly; Java security analysis |
| dependency-review.yml | PRs; fail closed if dependency review cannot be performed |
| release.yml | Approved version-changing main release commit or manual main dispatch; sign, publish Central, mirror and tag |
| pages.yml | Site changes and manual main dispatch; React tests, Chrome smoke, Pages deployment |

Dependabot covers Maven, GitHub Actions and site npm. The one-time signing bootstrap is retired. Historical run records may still appear in GitHub Actions; retain those for audit.

## Release checklist

1. Update VERSION, all Maven module versions and changelog. Keep Java package names, released wire contracts and migration bytes compatible unless explicitly approved. Do not reuse a version.
2. Open a release PR and require all protected checks. Squash merge with a verified commit and title beginning `release:`. A version-changing main push starts the release; non-release docs do not.
3. Confirm the release builds the three binary libraries, source/Javadoc archives and four POMs, signs them and publishes to Central. Confirm public consumer resolution, byte-matched GitHub mirror and GitHub Release.
4. Update README, integration guide, website version/source links and canonical decision log using verified publication evidence. The site deployment remains separate.
5. For partial publication, follow the Central recovery runbook; do not re-upload blindly or replace existing bytes.

## Historical evidence

- [v0.2.0 checklist](archive/V2_RELEASE_CHECKLIST.md)
- [v0.2.1 hardening checklist](archive/V2_HARDENING_CHECKLIST.md)
- [v0.3.0 three-JAR release](https://github.com/vyrnforge/platform-kernel/releases/tag/v0.3.0)
