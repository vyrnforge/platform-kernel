# Repository Security Hardening

Status: repository-controlled controls are implemented in source. GitHub administrator-only settings below must also be enabled in repository settings.

## Controls implemented in the repository

- CI uses minimum `GITHUB_TOKEN` permission (`contents: read`).
- GitHub Actions are pinned to immutable commit SHAs.
- Checkout does not persist Git credentials.
- Maven verification uses strict checksum validation.
- CodeQL runs on pull requests, `main`, and weekly with `security-extended` queries.
- Dependency Review blocks newly introduced dependencies with vulnerabilities of moderate severity or higher.
- Dependabot monitors Maven and GitHub Actions weekly.
- CODEOWNERS protects repository and security configuration once code-owner review is enabled by a ruleset.
- A security reporting policy is published.
- Pull requests include a kernel-boundary and security checklist.

## Required GitHub repository settings

### Rules > Rulesets > main

Create an **Active** branch ruleset targeting the default branch (`main`).

Require:

- pull request before merge;
- status checks:
  - `verify`
  - `CodeQL`
  - `dependency-review`
- branch to be up to date before merge;
- conversation resolution before merge;
- signed commits;
- linear history;
- block force pushes;
- block branch deletion.

For a solo-maintainer repository, keep required approving reviews at **0** initially so the maintainer is not permanently unable to merge their own PR. Once a second trusted maintainer exists, require **1 approval**, dismiss stale approvals, and require Code Owner review.

Keep bypass access limited to organization owners for emergency recovery only.

### Settings > General > Pull Requests

Recommended:

- enable **Allow squash merging**;
- disable merge commits;
- disable rebase merging;
- enable **Always suggest updating pull request branches**;
- enable **Automatically delete head branches**;
- optionally enable auto-merge after the required checks are stable.

### Settings > Actions > General

Recommended:

- allow GitHub-created actions only, unless a reviewed third-party action is explicitly required;
- default workflow permissions: **Read repository contents and packages**;
- do not allow GitHub Actions to create/approve pull requests unless a specific workflow needs it;
- do not send write tokens or repository secrets to workflows from fork pull requests;
- require approval for workflows from first-time/external contributors.

### Settings > Security / Advanced Security

Enable where available:

- dependency graph;
- Dependabot alerts;
- Dependabot security updates;
- secret scanning;
- push protection;
- CodeQL code scanning / advanced setup;
- private vulnerability reporting.

## Review cadence

Review this configuration when:

- a new workflow or external action is added;
- package publishing is enabled;
- a second maintainer joins;
- the repository becomes private;
- release/signing infrastructure is introduced;
- any workflow needs write permissions.
