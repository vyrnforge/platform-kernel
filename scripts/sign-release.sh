#!/usr/bin/env bash
set -euo pipefail
umask 077
stage="$1"
fingerprint="3772D5BF8DAAA18AB96A6CE46DBE5434595CDE18"
work="$(mktemp -d)"
export GNUPGHOME="$work/gnupg"
mkdir -m 700 "$GNUPGHOME"
trap 'gpgconf --kill all >/dev/null 2>&1 || true; rm -rf "$work"' EXIT
printf '%s' "$GPG_PRIVATE_KEY" | gpg --batch --import
printf '%s\n' "$GPG_PASSPHRASE" > "$work/passphrase"
gpg --batch --list-secret-keys "$fingerprint" >/dev/null
while IFS= read -r -d '' f; do
  gpg --batch --pinentry-mode loopback --passphrase-file "$work/passphrase" \
    --local-user "$fingerprint" --armor --detach-sign "$f"
  gpg --batch --verify "$f.asc" "$f"
  for alg in md5 sha1 sha256 sha512; do
    "${alg}sum" "$f" | cut -d' ' -f1 > "$f.$alg"
  done
done < <(find "$stage" -type f \( -name '*.pom' -o -name '*.jar' \) -print0)
test "$(find "$stage" -name '*.asc' | wc -l)" -eq 13
(cd "$stage" && zip -q -r "$RUNNER_TEMP/central-bundle.zip" io)
