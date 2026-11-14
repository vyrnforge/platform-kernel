# Security Policy

## Supported versions

The project has published pre-1.0 releases. Security fixes target the latest maintained release line on `main` and are distributed as new immutable versions; older releases are not maintained long-term-support lines. See [releases](https://github.com/vyrnforge/platform-kernel/releases) for the current supported version.

## Reporting a vulnerability

Please do **not** open a public issue containing vulnerability details, credentials, tokens, exploit steps, or sensitive data.

Preferred reporting path:

1. Open the repository **Security** tab.
2. Choose **Report a vulnerability** when private vulnerability reporting is available.
3. Include the affected component/version, impact, reproduction steps, and any proposed mitigation.

If private vulnerability reporting is not available, contact a VyrnForge maintainer through an existing private organizational channel before sharing technical details.

We will acknowledge valid reports, investigate impact, and coordinate remediation/disclosure appropriate to the project's pre-1.0 status.

## Scope

Security reports are especially relevant for:

- tenant isolation failures;
- authentication/context confusion;
- authorization bypass;
- dependency or build-chain compromise;
- secret/token exposure;
- unsafe event/audit data handling;
- path traversal, injection, deserialization, or code-execution issues in future adapters.
