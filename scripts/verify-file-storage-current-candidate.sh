#!/usr/bin/env bash
# CAPAUD-01: validate the development Kernel candidate with the current frozen File Storage checkout.
# This is NOT a released-version test. The candidate shares a POM version with released
# 0.3.2, so it MUST remain in an isolated, temporary Maven repository.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
consumer='a1903778af1e272ae15c025fe28c4cca369c09af'
version="$(tr -d '[:space:]' < "$root/VERSION")"
published_sha='88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e'
jar="$root/platform-kernel/target/platform-kernel-$version.jar"
test -s "$jar"
test "$version" = '0.3.2' || { echo "Expected audit-era candidate coordinates (0.3.2); refuse unexpected version" >&2; exit 1; }

candidate_sha="$(sha256sum "$jar" | cut -d' ' -f1)"
test "$candidate_sha" != "$published_sha" || { echo 'Expected distinct main-built candidate bytes, not immutable released archive' >&2; exit 1; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git init -q "$work/file-storage"
git -C "$work/file-storage" remote add origin 'https://github.com/vyrnforge/file-storage.git'
git -C "$work/file-storage" fetch --no-tags --depth=1 origin "$consumer"
git -C "$work/file-storage" checkout -q --detach FETCH_HEAD
test "$(git -C "$work/file-storage" rev-parse HEAD)" = "$consumer"
grep -Fq "<kernel.version>$version</kernel.version>" "$work/file-storage/backend/pom.xml"
grep -Fq '<maven.compiler.release>21</maven.compiler.release>' "$work/file-storage/backend/pom.xml"

repo="$work/m2"
# Install only inside isolated cache. Never replace the public Maven Central coordinates
# in the default machine cache, release repo or any consumer's application working tree.
mvn -B -ntp --strict-checksums -Dmaven.repo.local="$repo" \
  org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file \
  -Dfile="$root/pom.xml" -DpomFile="$root/pom.xml"
mvn -B -ntp --strict-checksums -Dmaven.repo.local="$repo" \
  org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file \
  -Dfile="$jar" -DpomFile="$root/platform-kernel/pom.xml"

installed="$repo/io/github/vyrnforge/platform-kernel/$version/platform-kernel-$version.jar"
test -s "$installed"
cmp --silent "$jar" "$installed"

(
  cd "$work/file-storage"
  export MAVEN_OPTS="${MAVEN_OPTS:-} -Dmaven.repo.local=$repo"
  make ci
)

# Confirm the consumer ran against exactly these *candidate* bytes, not the
# similarly named immutable published 0.3.2 jar.
cmp --silent "$jar" "$installed"
echo 'CAPAUD01_CURRENT_FS_CANDIDATE=SOURCE_CI_PASS'
echo "CAPAUD01_CURRENT_FS_SHA=$consumer"
echo "CAPAUD01_CANDIDATE_SOURCE_SHA=$(git -C "$root" rev-parse HEAD)"
echo "CAPAUD01_CANDIDATE_JAR_SHA256=$candidate_sha"
echo "CAPAUD01_RELEASED_JAR_SHA256=$published_sha"
echo 'CAPAUD01_SCOPE=existing-file-storage-codepaths-only'
echo 'CAPAUD01_LIMITATIONS=module-key-and-idempotency-borderline-inputs-not-necessarily-exercised,no-deployed-acceptance,no-independent-review'
