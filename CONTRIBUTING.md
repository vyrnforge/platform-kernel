# Contributing

## Boundary rules

1. The kernel owns cross-product technical primitives, not Asset/ITSM/IAM business logic.
2. The main `platform-kernel` JAR must not depend on product-domain packages or provider-specific IAM SDKs.
3. Tenant-owned access must fail closed when active tenant scope cannot be established or validated.
4. Module entitlement is tenant/product availability only; it must never replace domain authorization.
5. Raw credentials, tokens, secrets, and undocumented provider claims must not enter stable kernel contracts.
6. Breaking API/event/schema changes require explicit versioning and migration guidance.
7. Do not add a database, broker, workflow engine, or service topology requirement without a concrete consumer and an ADR.

## Java source hygiene

Use the repository `.editorconfig`: UTF-8, LF, final newline, four-space Java indentation and no trailing whitespace. Prefer one statement per line, explicit names, minimal reflection and focused public contracts. Do not apply a repository-wide formatting rewrite to unrelated security/JDBC logic; separate semantic changes from mechanical cleanup.

The standard-library-only `scripts/check-java-hygiene.py` verifies whitespace invariants in Java production, tests, references and verification fixtures. It intentionally does **not** enforce line length, identifier rules or a formatter-dependent layout across historical code. Use focused tests and negative tenant/replay cases for behavioral changes.

## Verification

Use Java 21, Maven 3.9+ and Docker for PostgreSQL Testcontainers. The source/Javadoc profile matches the release pipeline. Node 22+ is needed only for [site development](site/README.md).

```bash
python3 scripts/check-java-hygiene.py
bash scripts/verify-core.sh
python3 scripts/check-contract-compatibility.py
mvn --batch-mode --no-transfer-progress --strict-checksums -Prelease-docs clean verify
python3 scripts/check-distribution.py --release-docs
```

PRs should include negative tenant-isolation coverage for any change affecting tenancy or authorization plumbing.

## Pull requests and releases

Keep changes focused. Open a PR against `main`; required checks include `verify`, `CodeQL` and `dependency-review`. Use a squash merge with a verified commit. A release PR updates VERSION and all Maven module versions and uses a `release:` merge title. See [release operations](docs/releases/README.md). Documentation-only changes do not publish a new library. Avoid direct pushes to protected main or unreviewed workflow changes.

## Change-scoped CI (branch protection remains enabled)

The required PR checks remain **`verify`**, **`CodeQL`** and **`dependency-review`** on *every* PR. GitHub leaves path-filtered required workflows pending, so these checks start with a lightweight path classifier instead of filtering out the entire workflow. Non-applicable expensive steps are skipped; the required check still reports its routing decision.

| Changed files | Pages Node/Chromium | Java/PostgreSQL/distribution/consumer checks | Java CodeQL | Dependency diff action |
| --- | --- | --- | --- | --- |
| `site/src/**`, `site/README.md` | Yes | No | No | No |
| `site/package.json` or `site/package-lock.json` | Yes | No | No | Yes |
| Regular `docs/**` and root prose | No | No | No | No |
| Kernel source, schema contracts, scripts, verification or `pom.xml` | No | Yes | Yes | When a manifest/lockfile changed |
| `.github/workflows/pages.yml` | Yes | No | No | Yes |
| Core/security/release workflows or unknown configuration | Depends on site scope | Yes | Yes | When supply-chain configuration changed |

The lightweight gates still run for skipped scopes and `scripts/tests/test_ci_scope.py` exercises the classifier. Contract/reference governance docs under `docs/contracts/**` and release recovery records under `docs/releases/recovery/**` conservatively run Java verification. Mixed PRs run the union of relevant checks. Unknown/missing Git diffs **fail closed to all checks**. Weekly CodeQL and manually dispatched Java/CodeQL checks always run in full. The Pages workflow stays scoped to `site/**`; the credentialed release workflow is unchanged and retains its separate VERSION/commit-title/owner approval boundary.

Scope changes are supply-chain sensitive. Check that the full checks run for a workflow PR and inspect both GitHub job logs and branch-protection check names before merging. A green no-op gate is **not** evidence that its expensive checks ran; see the explicit routing step in the job log.

## Review discipline

For changes to public contracts, authentication/tenant controls, database migrations, publishing workflows or signing keys, request independent qualified review before merge whenever a second authorized maintainer is available. Current single-maintainer operation cannot produce independent approval; record the named owner acceptance, exact revision, protected CI evidence, compatibility/rollback review and the exception in the PR. Do not count an automated check as human approval. Keep protections active; when a qualified second maintainer is appointed, owner approves enabling required approvals/CODEOWNERS reviews. Never bypass signed-commit or required-check controls. Signing-key custody and token revocation are owner-controlled; see [key operations](docs/releases/signing-key-operations.md).
