# Kernel V2 release checklist

Release version: **0.2.0**

## Automated gates

- [ ] protected `verify` check green;
- [ ] CodeQL green;
- [ ] Dependency Review green;
- [ ] v0.1 immutable contract baseline green;
- [ ] v0.2 released contract package validation green;
- [ ] PostgreSQL integration tests green;
- [ ] Asset V2 end-to-end test green.

## Security / governance

- [x] V2 threat model documented;
- [x] V2 internal security review completed;
- [x] audit append-only database control implemented;
- [x] provider-neutral production identity integration boundary implemented;
- [x] File Storage explicitly excluded from V2.

## Release publication

The repository's connected automation currently supports release workflow execution but the ChatGPT GitHub connector does not expose tag/GitHub-Release creation.

Final publication sequence:

1. merge the release-hardening PR to `main`;
2. create tag `v0.2.0` at the verified release commit;
3. push the tag, or manually run the `release` workflow from that commit;
4. verify GitHub Packages contains the `io.vyrnforge.platform` 0.2.0 artifacts;
5. create/publish GitHub Release `v0.2.0` using `CHANGELOG.md`;
6. record the immutable tag/release/package URLs in the project change log.

Do not mark release closure complete until steps 2–5 are verified.
