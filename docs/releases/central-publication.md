# Maven Central publishing

Verified organization namespace: io.github.vyrnforge. Runtime packages remain io.vyrnforge.platform.kernel.*. Three library JARs, plus six documentation archives and the parent POM. Version 0.3.0 is immutable and remains on GitHub Packages.

Release PRs must pass protected CI, CodeQL and dependency review. Only main commits with release: prefix (or owner manual dispatch on main) trigger publishing. A single build produces the release files. The workflow checks the exact inventory, contract baseline, test suite, sources and Javadoc, stages four POMs and nine JARs, signs with the dedicated public fingerprint, and uses the Sonatype Publisher API for automatic validation and publication. It mirrors the same POM/JAR bytes to GitHub Packages and only creates the GitHub Release after both destinations succeed.

Secrets: CENTRAL_USERNAME, CENTRAL_PASSWORD, GPG_PRIVATE_KEY, GPG_PASSPHRASE. GPG_REVOCATION_CERT is recovery-only. No secrets in PR builds. Revoke temporary SIGNING_BOOTSTRAP_TOKEN after bootstrap. Signing key expiry November 2027; rotate before expiration and update the fingerprint in the signing script in a reviewed PR. Maintain an owner-controlled encrypted backup/revocation procedure; GitHub Secrets are not a readable backup.

Recovery: do not rerun a failed upload blindly. Check Central Portal Deployments for the version and deployment ID. If pending/publishing, wait or investigate. If failed, drop only the failed deployment after reviewing errors. If published, never replace it. Manual recovery must check the exact published bytes before mirroring; any partial GitHub package deployment must be reconciled file-by-file, not overwritten. If the original build cannot be reproduced exactly, retrieve the published artifacts from Central. Never bump a version just to conceal a partial publish.

Official requirements: https://central.sonatype.org/publish/requirements/ and https://central.sonatype.org/publish/publish-portal-api/.
