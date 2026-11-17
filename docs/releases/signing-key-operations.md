# Release signing key operations

The one-time bootstrap completed on 14 November 2026: [successful run](https://github.com/vyrnforge/platform-kernel/actions/runs/43590738898). Its workflow has been removed from main. Do not recreate a standing Secrets-write token.

Public fingerprint: `3772D5BF8DAAA18AB96A6CE46DBE5434595CDE18`. RSA 4096, expires November 2027. Public key was published to keyserver.ubuntu.com and retrieved in a clean keyring to verify a signature.

Active publishing secrets: CENTRAL_USERNAME, CENTRAL_PASSWORD, GPG_PRIVATE_KEY, GPG_PASSPHRASE. GPG_REVOCATION_CERT is recovery-only. The Product Owner attested in [issue #36](https://github.com/vyrnforge/platform-kernel/issues/36) that the temporary fine-grained bootstrap token was revoked and SIGNING_BOOTSTRAP_TOKEN removed from GitHub Secrets; active signing/publishing secrets remain in service. This was owner-attested, not independently inspected by the connector.

GitHub Secrets cannot be read back as a backup. The Product Owner attested in [issue #36](https://github.com/vyrnforge/platform-kernel/issues/36) that owner-controlled encrypted backup, revocation-certificate custody and a rotation/recovery plan are secured. This is not an independent cryptographic custody inspection or proof of current secret access. Never expose private keys, passphrases, tokens or revocation material in logs, artifacts, source or chat. Rotate the signing key before expiry and update the pinned fingerprint in scripts/sign-release.sh via reviewed PR; verify the replacement public key before using it. Rotate the Central publishing token before its own expiration.

The bootstrap source and evidence remain in [PR #17](https://github.com/vyrnforge/platform-kernel/pull/17). For a suspected compromise, stop release automation, revoke affected credentials/key through the approved owner process and investigate before publishing again.
