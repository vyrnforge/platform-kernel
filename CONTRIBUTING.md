# Contributing

## Boundary rules

1. The kernel owns cross-product technical primitives, not Asset/ITSM/IAM business logic.
2. The main `platform-kernel` JAR must not depend on product-domain packages or provider-specific IAM SDKs.
3. Tenant-owned access must fail closed when active tenant scope cannot be established or validated.
4. Module entitlement is tenant/product availability only; it must never replace domain authorization.
5. Raw credentials, tokens, secrets, and undocumented provider claims must not enter stable kernel contracts.
6. Breaking API/event/schema changes require explicit versioning and migration guidance.
7. Do not add a database, broker, workflow engine, or service topology requirement without a concrete consumer and an ADR.

## Verification

Use Java 21, Maven 3.9+ and Docker for PostgreSQL Testcontainers. The source/Javadoc profile matches the release pipeline. Node 22+ is needed only for [site development](site/README.md).

```bash
bash scripts/verify-core.sh
python3 scripts/check-contract-compatibility.py
mvn --batch-mode --no-transfer-progress --strict-checksums -Prelease-docs clean verify
python3 scripts/check-distribution.py --release-docs
```

PRs should include negative tenant-isolation coverage for any change affecting tenancy or authorization plumbing.

## Pull requests and releases

Keep changes focused. Open a PR against `main`; required checks include `verify`, `CodeQL` and `dependency-review`. Use a squash merge with a verified commit. A release PR updates VERSION and all Maven module versions and uses a `release:` merge title. See [release operations](docs/releases/README.md). Documentation-only changes do not publish a new library. Avoid direct pushes to protected main or unreviewed workflow changes.

## Review discipline

For changes to public contracts, authentication/tenant controls, database migrations, publishing workflows or signing keys, request independent qualified review before merge whenever a second authorized maintainer is available. Current single-maintainer operation cannot produce independent approval; record the named owner acceptance, exact revision, protected CI evidence, compatibility/rollback review and the exception in the PR. Do not count an automated check as human approval. Keep protections active; when a qualified second maintainer is appointed, owner approves enabling required approvals/CODEOWNERS reviews. Never bypass signed-commit or required-check controls. Signing-key custody and token revocation are owner-controlled; see [key operations](docs/releases/signing-key-operations.md).
