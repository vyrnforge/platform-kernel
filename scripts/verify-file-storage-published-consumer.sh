#!/usr/bin/env bash
# CAPAUD-04: frozen current-branch File Storage consumer against immutable Central v0.3.2.
# This is isolated, read-only to both source repos, and does not prove deployed acceptance.
set -euo pipefail

CONSUMER_SHA='a1903778af1e272ae15c025fe28c4cca369c09af'
KERNEL_VERSION='0.3.2'
KERNEL_SHA256='88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e'
KERNEL_URL='https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.2/platform-kernel-0.3.2.jar'

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Force exact consumer source, not the earlier historical FS-110A checkout.
git init -q "$work/file-storage"
git -C "$work/file-storage" remote add origin 'https://github.com/vyrnforge/file-storage.git'
git -C "$work/file-storage" fetch --no-tags --depth=1 origin "$CONSUMER_SHA"
git -C "$work/file-storage" checkout -q --detach FETCH_HEAD
test "$(git -C "$work/file-storage" rev-parse HEAD)" = "$CONSUMER_SHA"

pom="$work/file-storage/backend/pom.xml"
grep -Fq '<maven.compiler.release>21</maven.compiler.release>' "$pom"
grep -Fq "<kernel.version>$KERNEL_VERSION</kernel.version>" "$pom"
for component in file-storage-application file-storage-security; do
  grep -Fq '<artifactId>platform-kernel</artifactId>' "$work/file-storage/backend/$component/pom.xml"
done

# Compare the exact public archive with what this consumer actually resolves.
# An isolated Maven repository prevents contamination by a candidate main build
# that still advertises the immutable 0.3.2 coordinates.
curl --fail --location --retry 3 --silent --show-error --proto '=https' --tlsv1.2 \
  "$KERNEL_URL" --output "$work/published-kernel.jar"
printf '%s  %s\n' "$KERNEL_SHA256" "$work/published-kernel.jar" | sha256sum --check --status

export MAVEN_OPTS="${MAVEN_OPTS:-} -Dmaven.repo.local=$work/maven-repository"
(
  cd "$work/file-storage"
  # Runs the consumer's own hygiene, full Maven verify, JWT/security negatives,
  # FileApplication, and persistence tests. No Kernel JDBC adoption is implied.
  make ci
)

# CAPAUD-03: verify named real consumer negative tests actually executed.
python3 "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/check-file-storage-security-evidence.py" "$work/file-storage/backend"

resolved="$work/maven-repository/io/github/vyrnforge/platform-kernel/$KERNEL_VERSION/platform-kernel-$KERNEL_VERSION.jar"
test -s "$resolved"
cmp --silent "$work/published-kernel.jar" "$resolved"
printf '%s  %s\n' "$KERNEL_SHA256" "$resolved" | sha256sum --check --status

echo "CAPAUD04_RESULT=SOURCE_CI_PASS"
echo "CAPAUD04_CONSUMER_SHA=$CONSUMER_SHA"
echo "CAPAUD04_KERNEL_RELEASE=$KERNEL_VERSION"
echo "CAPAUD04_RESOLVED_KERNEL_SHA256=$(sha256sum "$resolved" | cut -d' ' -f1)"
echo 'CAPAUD04_LIMITATIONS=no-live-IdP,no-deployed-application,no-independent-review,no-deployed-restore-proof'
