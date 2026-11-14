# Kernel V2 release checklist

Release version: **0.2.0**

## Automated gates

- [ ] protected `verify` check green;
- [ ] CodeQL green;
- [ ] Dependency Review green;
- [ ] immutable `v0.1` draft contract baseline green;
- [ ] immutable released `v0.2` contract baseline green;
- [ ] PostgreSQL integration tests green;
- [ ] Asset V2 end-to-end test green.

## Security / governance

- [x] V2 threat model documented;
- [x] V2 internal security review completed;
- [x] audit append-only database control implemented;
- [x] provider-neutral production identity integration boundary implemented;
- [x] File Storage explicitly excluded from V2.

## Publication

After the release-hardening PR passes protected checks, squash-merge it with a commit title beginning with `release:`.

The protected `release` workflow then:

1. verifies `VERSION` and Maven version are exactly `0.2.0`;
2. re-runs contract compatibility and the full Maven verification suite;
3. publishes non-test Maven artifacts to GitHub Packages;
4. creates immutable Git tag `v0.2.0` at the release commit;
5. creates GitHub Release `v0.2.0` using `CHANGELOG.md`.

Release closure is complete only after that workflow is green and the tag, GitHub Release, and package publication are verified.
