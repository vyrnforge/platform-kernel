#!/usr/bin/env bash
set -euo pipefail
version="$1"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
root="$(cd "$(dirname "$0")/.." && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cat > "$work/settings.xml" <<'EOF'
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"/>
EOF
cat > "$work/pom.xml" <<EOF
<project xmlns="http://maven.apache.org/POM/4.0.0">
  <modelVersion>4.0.0</modelVersion>
  <groupId>example.consumer</groupId><artifactId>kernel-central-smoke</artifactId><version>1</version>
  <dependencies>
    <dependency><groupId>io.github.vyrnforge</groupId><artifactId>platform-kernel</artifactId><version>$version</version></dependency>
    <dependency><groupId>io.github.vyrnforge</groupId><artifactId>platform-kernel-jdbc</artifactId><version>$version</version></dependency>
    <dependency><groupId>io.github.vyrnforge</groupId><artifactId>platform-kernel-testkit</artifactId><version>$version</version><scope>test</scope></dependency>
  </dependencies>
</project>
EOF
# No GitHub repository, token, Maven settings server or warmed local artifacts.
mvn --batch-mode --no-transfer-progress --strict-checksums \
  -s "$work/settings.xml" -gs "$work/settings.xml" -Dmaven.repo.local="$work/m2" \
  -f "$work/pom.xml" org.apache.maven.plugins:maven-dependency-plugin:3.8.1:build-classpath \
  -Dmdep.includeScope=test -Dmdep.outputFile="$work/classpath"
cp="$(cat "$work/classpath")"
mkdir "$work/classes"
javac --release 21 -cp "$cp" -d "$work/classes" "$root/verification/GoldenPathSmokeTest.java"
java -cp "$work/classes:$cp" GoldenPathSmokeTest
javap -classpath "$cp" io.vyrnforge.platform.kernel.persistence.jdbc.JdbcReliabilityTransaction >/dev/null
echo "Anonymous Maven Central consumer resolved and executed $version."
