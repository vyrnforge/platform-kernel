# Contributing

## Boundary rules

1. The kernel owns cross-product technical primitives, not Asset/ITSM/IAM business logic.
2. `kernel-core` must not depend on product-domain packages or provider-specific IAM SDKs.
3. Tenant-owned access must fail closed when active tenant scope cannot be established or validated.
4. Module entitlement is tenant/product availability only; it must never replace domain authorization.
5. Raw credentials, tokens, secrets, and undocumented provider claims must not enter stable kernel contracts.
6. Breaking API/event/schema changes require explicit versioning and migration guidance.
7. Do not add a database, broker, workflow engine, or service topology requirement without a concrete consumer and an ADR.

## Verification

```bash
bash scripts/verify-core.sh
mvn verify
```

PRs should include negative tenant-isolation coverage for any change affecting tenancy or authorization plumbing.
