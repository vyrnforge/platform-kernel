# Kernel 0.3.1 — three-JAR distribution

DEC-K015 / DEC-K016: three-JAR packaging and organization-level Maven publication, not new capabilities or an architecture change.

## Maven dependencies

Use Maven Central (default Maven repository) once v0.3.1 is published. GitHub Packages remains a mirror; it requires authenticated Maven settings (server ID github). Never commit tokens.

```xml
<dependencies>
  <dependency>
    <groupId>io.github.vyrnforge</groupId>
    <artifactId>platform-kernel</artifactId>
    <version>0.3.1</version>
  </dependency>
  <!-- Optional: omit for products without JDBC reliability -->
  <dependency>
    <groupId>io.github.vyrnforge</groupId>
    <artifactId>platform-kernel-jdbc</artifactId>
    <version>0.3.1</version>
  </dependency>
  <dependency>
    <groupId>io.github.vyrnforge</groupId>
    <artifactId>platform-kernel-testkit</artifactId>
    <version>0.3.1</version>
    <scope>test</scope>
  </dependency>
</dependencies>
```

## Migration from 0.2.1 / 0.3.0

From 0.3.0, replace group ID `io.vyrnforge.platform` with `io.github.vyrnforge` and version 0.3.1 for all three dependencies; artifact IDs and Java packages are unchanged. Do not mix the old and new group IDs.

| Old coordinates (artifactId) | Replace with |
| --- | --- |
| platform-kernel-core | platform-kernel |
| platform-kernel-http | platform-kernel |
| platform-kernel-controls | platform-kernel |
| platform-kernel-observability | platform-kernel |
| platform-kernel-contracts | platform-kernel |
| platform-kernel-persistence-jdbc | platform-kernel-jdbc |
| platform-kernel-testkit | same artifact, new group ID/version 0.3.1, test scope |

Remove the old dependencies rather than adding the new JARs alongside them. Inspect `mvn dependency:tree` for transitive references to the old split distribution and upgrade or exclude those dependencies. Java imports, method signatures, schema resource names and database migration checksums remain unchanged. The existing v0.2.1 artifacts are retained; schema-only consumers can continue using the historical contracts artifact if necessary.

The main JAR contains no JDBC, Flyway, Jackson, JUnit, testkit or domain implementation classes. JDBC and testkit depend on the main JAR; Maven resolves ordinary external JDBC adapter dependencies. These are thin libraries, not executable or self-contained fat JARs. A manually downloaded JDBC JAR still needs its Maven dependencies on the classpath.

There are exactly three kernel library JARs plus parent POM metadata and supplementary sources/Javadoc archives. The test-only Asset reference is not distributed. No database migration is added by this release; existing V1–V3 remain intact. See [production hardening](../v2/production-hardening.md) for the existing V3 rollout and reliability requirements.

## Verification

`mvn clean verify` runs the existing core, HTTP, controls, observability, JDBC/PostgreSQL, testkit and Asset reference tests. HTTP integration tests using testkit fixtures now live in the testkit test suite to prevent a main-to-testkit cyclic Maven dependency. `python3 scripts/check-distribution.py` checks exact JAR inventory, expected classes/resources, frozen schema/migration bytes and runs the standalone consumer smoke against the physical JARs.
