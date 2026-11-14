# ADR-0004 — Three-JAR distribution and public publication

Status: Accepted distribution direction (DEC-K015 / DEC-K016). Date: 2026-11-14.

## Decision

Maintain three thin library JARs: platform-kernel, platform-kernel-jdbc, platform-kernel-testkit. Core, HTTP, controls, observability and schema resources live in the main JAR; Java package boundaries remain. JDBC stays optional; testkit stays test-scope. The parent POM and source/Javadoc archives are supplementary publication files.

Use verified Maven group ID io.github.vyrnforge for 0.3.1 onward. Publish approved immutable releases to Maven Central, then mirror the same Maven payloads to GitHub Packages and attach the three binary JARs to GitHub Releases. Preserve the old io.vyrnforge.platform releases and Java packages, schema bytes and SQL migrations.

## Consequences

This supersedes only the artifact/module packaging portions of ADR 0001–0003, not their architectural guarantees. No runtime capability or domain ownership changes. Do not put old and new coordinates on the same classpath. Central users need no GitHub credentials. See [release operations](../releases/README.md).
