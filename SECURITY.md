# Security Policy

## Supported versions

The project is pre-release. Until the first stable release is published, security fixes are made against the latest `main` branch only.

## Reporting a vulnerability

Please do **not** open a public issue containing vulnerability details, credentials, tokens, exploit steps, or sensitive data.

Preferred reporting path:

1. Open the repository **Security** tab.
2. Choose **Report a vulnerability** when private vulnerability reporting is available.
3. Include the affected component/version, impact, reproduction steps, and any proposed mitigation.

If private vulnerability reporting is not available, contact a VyrnForge maintainer through an existing private organizational channel before sharing technical details.

We will acknowledge valid reports, investigate impact, and coordinate remediation/disclosure appropriate to the project's pre-release status.

## Scope

Security reports are especially relevant for:

- tenant isolation failures;
- authentication/context confusion;
- authorization bypass;
- dependency or build-chain compromise;
- secret/token exposure;
- unsafe event/audit data handling;
- path traversal, injection, deserialization, or code-execution issues in future adapters.
