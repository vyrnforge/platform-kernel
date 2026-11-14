#!/usr/bin/env bash
# Read-only Central reconciliation. Never upload, drop or republish a deployment.
set -euo pipefail
record="$1"
stage="$2"
version="$(jq -er '.version' "$record")"
id="$(jq -er '.deploymentId' "$record")"
source="$(jq -er '.sourceCommit' "$record")"
fingerprint="$(jq -er '.fingerprint' "$record")"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$id" =~ ^[0-9a-f-]{36}$ ]]
[[ "$source" =~ ^[0-9a-f]{40}$ ]]
[[ "$fingerprint" =~ ^[0-9A-F]{40}$ ]]
git merge-base --is-ancestor "$source" HEAD
test "$(git show "$source:VERSION" | tr -d '[:space:]')" = "$version"
token="$(printf '%s:%s' "$CENTRAL_USERNAME" "$CENTRAL_PASSWORD" | base64 -w0)"
echo "::add-mask::$token"
api="https://central.sonatype.com/api/v1/publisher"
status="$(curl --silent --show-error --fail --max-time 30 -X POST -H "Authorization: Bearer $token" "$api/status?id=$id")"
state="$(jq -er '.deploymentState' <<< "$status")"
echo "Central deployment $id: $state"
echo "Central deployment $id: $state" >> "$GITHUB_STEP_SUMMARY"
test "$(jq -er '.deploymentId' <<< "$status")" = "$id"
test "$state" = PUBLISHED || { echo "Deployment not published; no writes performed. Inspect Portal."; exit 1; }
# Verify the complete artifact set from Central, using the original release signing key.
work="$(mktemp -d)"
export GNUPGHOME="$work/gnupg"
mkdir -m 700 "$GNUPGHOME"
trap 'gpgconf --kill all >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
gpg --batch --keyserver hkps://keyserver.ubuntu.com --recv-keys "$fingerprint"
test "$(gpg --batch --with-colons --list-keys "$fingerprint" | awk -F: '$1=="fpr"{print $10;exit}')" = "$fingerprint"
base="https://repo.maven.apache.org/maven2"
group="io/github/vyrnforge"
mkdir -p "$stage"
for artifact in platform-kernel-parent platform-kernel platform-kernel-jdbc platform-kernel-testkit; do
  case "$artifact" in
    platform-kernel-parent) pom="pom.xml"; suffixes=(.pom);;
    platform-kernel) pom="platform-kernel/pom.xml"; suffixes=(.pom .jar -sources.jar -javadoc.jar);;
    platform-kernel-jdbc) pom="kernel-persistence-jdbc/pom.xml"; suffixes=(.pom .jar -sources.jar -javadoc.jar);;
    platform-kernel-testkit) pom="kernel-testkit/pom.xml"; suffixes=(.pom .jar -sources.jar -javadoc.jar);;
  esac
  rel="$group/$artifact/$version"
  mkdir -p "$stage/$rel"
  for suffix in "${suffixes[@]}"; do
    name="$artifact-$version$suffix"
    for ext in "" ".asc"; do
      curl --silent --show-error --fail --retry 3 --retry-delay 5 --max-time 60 \
        "$base/$rel/$name$ext" -o "$stage/$rel/$name$ext"
    done
    gpg --batch --status-fd 1 --verify "$stage/$rel/$name.asc" "$stage/$rel/$name" > "$work/verify"
    grep -Fq "[GNUPG:] VALIDSIG $fingerprint " "$work/verify"
    sha256sum "$stage/$rel/$name"
  done
  git show "$source:$pom" > "$work/original.pom"
  cmp "$work/original.pom" "$stage/$rel/$artifact-$version.pom"
done
test "$(find "$stage" -name '*.pom' | wc -l)" -eq 4
test "$(find "$stage" -name '*.jar' | wc -l)" -eq 9
echo "Verified 13 signed Maven payloads and original release POMs; no Central writes."
