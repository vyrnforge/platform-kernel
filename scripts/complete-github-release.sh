#!/usr/bin/env bash
# Finish an existing, pinned release without moving tags or replacing assets.
set -euo pipefail
version="$1"
source="$2"
stage="$3"
tag="v$version"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
[[ "$source" =~ ^[0-9a-f]{40}$ ]]
# Require an existing tag, pinned to the exact artifact source.
git fetch --no-tags origin "refs/tags/$tag:refs/tags/$tag"
test "$(git rev-list -n1 "$tag")" = "$source" || { echo "Tag mismatch; refusing to publish."; exit 1; }
git show "$source:CHANGELOG.md" > "$RUNNER_TEMP/release-notes.md"
assets=()
for artifact in platform-kernel platform-kernel-jdbc platform-kernel-testkit; do
  file="$stage/io/github/vyrnforge/$artifact/$version/$artifact-$version.jar"
  test -s "$file"
  assets+=("$file")
done
if ! gh release view "$tag" >/dev/null 2>&1; then
  # Existing tag avoids the Actions token's restriction on creating tags at old workflow commits.
  gh release create "$tag" --verify-tag --draft --title "Kernel — $tag" --notes-file "$RUNNER_TEMP/release-notes.md"
fi
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
for file in "${assets[@]}"; do
  name="$(basename "$file")"
  existing="$(gh release view "$tag" --json assets --jq '.assets[].name')"
  if grep -Fxq "$name" <<< "$existing"; then
    gh release download "$tag" --pattern "$name" --dir "$work"
    cmp "$file" "$work/$name" || { echo "Existing asset differs: $name"; exit 1; }
  else
    gh release upload "$tag" "$file"
    gh release download "$tag" --pattern "$name" --dir "$work"
    cmp "$file" "$work/$name"
  fi
done
test "$(gh release view "$tag" --json assets --jq '.assets | length')" = 3
# New tags are reserved before Central upload; recovery of a historical draft may require owner publication.
if [[ "$(gh release view "$tag" --json isDraft --jq '.isDraft')" == true ]]; then
  gh release edit "$tag" --draft=false
fi
echo "GitHub release and all three original binary assets verified."
