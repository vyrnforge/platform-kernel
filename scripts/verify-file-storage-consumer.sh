#!/usr/bin/env bash
# Independent pinned consumer, isolated Maven cache; no publish or modification of File Storage.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(tr -d '[:space:]' < "$root/VERSION")"
consumer=43f1c5552a3202ad0724e516fe51c03886373591
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git init -q "$work/file-storage"
git -C "$work/file-storage" remote add origin https://github.com/vyrnforge/file-storage.git
git -C "$work/file-storage" fetch --depth=1 origin "$consumer"
git -C "$work/file-storage" checkout --detach FETCH_HEAD
test "$(git -C "$work/file-storage" rev-parse HEAD)" = "$consumer"
jar="$root/platform-kernel/target/platform-kernel-$version.jar"
test -s "$jar"
sha256sum "$jar"
mvn -B -ntp --strict-checksums -Dmaven.repo.local="$work/m2" org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file -Dfile="$root/pom.xml" -DpomFile="$root/pom.xml"
mvn -B -ntp --strict-checksums -Dmaven.repo.local="$work/m2" org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file -Dfile="$jar" -DpomFile="$root/platform-kernel/pom.xml"
cd "$work/file-storage"
# The pinned consumer already uses Central coordinates; change only its version
# in this disposable checkout and require the exact locally installed candidate.
sed -i "s|<kernel.version>0.3.2</kernel.version>|<kernel.version>$version</kernel.version>|" backend/pom.xml
grep -Fq "<kernel.version>$version</kernel.version>" backend/pom.xml
installed="$work/m2/io/github/vyrnforge/platform-kernel/$version/platform-kernel-$version.jar"
cmp "$jar" "$installed"
export MAVEN_OPTS="${MAVEN_OPTS:-} -Dmaven.repo.local=$work/m2"
make ci
cmp "$jar" "$installed"
echo "File Storage $consumer passed with kernel $version candidate."
