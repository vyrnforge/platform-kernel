## Summary

Describe the change and why it belongs in the shared kernel.

## Boundary / security checklist

- [ ] No IAM, Asset, ITSM, workflow, or other business-domain logic was moved into the kernel.
- [ ] No secret, token, credential, private key, or sensitive production data is included.
- [ ] Tenant-owned paths remain explicitly tenant-scoped and include negative isolation coverage where relevant.
- [ ] Module entitlement is not being used as user/resource authorization.
- [ ] Consumer-facing contract changes are backward-compatible, or are explicitly versioned with migration guidance.
- [ ] New GitHub Actions are pinned to immutable commit SHAs.
- [ ] Tests and security checks pass.
