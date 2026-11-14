# One-time release signing bootstrap

This manual main-only workflow supports setup without a workstation. It creates a dedicated RSA 4096-bit OpenPGP signing key with a one-year lifetime, verifies its public key via a Central-supported keyserver, and uses GitHub's encrypted secrets API through gh. It does not publish a Maven release, run on pull requests, or change repository permissions.

## Owner steps
1. Create a fine-grained personal access token with resource owner **vyrnforge**, access to only **platform-kernel**, repository permission **Secrets: Read and write**, short expiration (7 days or the shortest available). No contents, administration, packages or workflows write permissions. Organization approval may be needed.
2. Save it as repository Actions secret `SIGNING_BOOTSTRAP_TOKEN`. Never paste the token in chat.
3. Run **Bootstrap release signing** on main in Actions. The workflow refuses to overwrite existing signing secrets. It prints only the public fingerprint and secret names.
4. Verify success and the existence of GPG_PRIVATE_KEY, GPG_PASSPHRASE and GPG_REVOCATION_CERT. Revoke the temporary token and delete SIGNING_BOOTSTRAP_TOKEN immediately. Remove the bootstrap workflow after successful setup.
5. Keep the public fingerprint with release records. Set a rotation reminder before expiration.

The revocation certificate is stored separately as a secret because this key is created on an ephemeral runner. GitHub Secrets cannot be read back through the UI/API. A separately approved recovery procedure is needed to export an encrypted backup into an owner-controlled vault or use the revocation certificate if necessary. Do not print either secret. If a partial secret write occurs, inspect names only and coordinate recovery; never automatically overwrite or delete a working signing key. No production release uses this key until the separate Central workflow is validated.

Reference: https://central.sonatype.org/publish/requirements/gpg/ and https://docs.github.com/en/rest/actions/secrets.
