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

## Public documentation and artifact disclosure (DOCSEC)

- [ ] Changed public site, README, docs, Javadoc, Java source and packaged resources contain no classified INTERNAL-DESIGN or RESTRICTED content; refer to [policy](../docs/security/publication-boundaries.md).
- [ ] Published usage examples still tell consumers how to verify identity, tenant/resource authorization and applicable retry/audit/outbox guarantees; no weakening or undocumented change in contract semantics.
- [ ] Generated `site/dist` assets and affected binary/source/Javadoc JARs have been inspected with the bounded DOCSEC gate at the exact PR SHA, with safe artifact hash evidence. Scanner success is **not** a human Security sign-off.
- [ ] Confidential Mermaid/design notes, if any, are in an access-controlled destination and **not** in the public repo/bundles/JARs. Historical source and releases remain public.
- [ ] Product/technical/security reviewers and remaining manual UX/AT and adopter-task evidence are recorded, or missing checks are explicitly labeled pending. Do not waive independent review without a scoped authorization.
- [ ] If a new version is proposed, documentation was prepared before publication (DEC-K033), and a separate merge/release approval is recorded.
