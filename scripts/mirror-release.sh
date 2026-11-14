#!/usr/bin/env bash
set -euo pipefail
stage="$1"
version="$(tr -d '[:space:]' < VERSION)"
group="io/github/vyrnforge"
base="https://repo.maven.apache.org/maven2"
ghbase="https://maven.pkg.github.com/vyrnforge/platform-kernel"
# Check every Maven payload byte against Central before mirroring; publication may take time to propagate.
for attempt in $(seq 1 30); do
  ready=1
  while IFS= read -r -d '' file; do
    rel="${file#"$stage/"}"
    if ! curl --silent --show-error --fail --max-time 30 "$base/$rel" -o "$RUNNER_TEMP/central-check"; then
      ready=0; break
    fi
    cmp -s "$file" "$RUNNER_TEMP/central-check" || { echo "Central byte mismatch: $rel"; exit 1; }
  done < <(find "$stage" -type f \( -name '*.jar' -o -name '*.pom' \) -print0)
  if [[ "$ready" == 1 ]]; then break; fi
  sleep 10
done
test "$ready" == 1
# Existing destinations must be complete and identical. Stop rather than overwrite a partial version.
for artifact in platform-kernel-parent platform-kernel platform-kernel-jdbc platform-kernel-testkit; do
  dir="$stage/$group/$artifact/$version"
  stem="$artifact-$version"
  present=0; missing=0
  for file in "$dir"/*.pom "$dir"/*.jar; do
    test -f "$file" || continue
    rel="${file#"$stage/"}"
    code="$(curl --silent --show-error --max-time 30 -u "$GITHUB_ACTOR:$GITHUB_TOKEN" -o "$RUNNER_TEMP/mirror-check" -w '%{http_code}' "$ghbase/$rel")"
    case "$code" in
      200) cmp -s "$file" "$RUNNER_TEMP/mirror-check" || { echo "Mirror byte mismatch: $rel"; exit 1; }; present=$((present+1));;
      404) missing=$((missing+1));;
      *) echo "Mirror check failed HTTP $code"; exit 1;;
    esac
  done
  if [[ "$missing" == 0 ]]; then continue; fi
  test "$present" == 0 || { echo "Partial mirror for $artifact; reconcile manually"; exit 1; }
  args=(-Durl="$ghbase" -DrepositoryId=github -DpomFile="$dir/$stem.pom" -DgeneratePom=false)
  if [[ "$artifact" == platform-kernel-parent ]]; then
    args+=(-Dfile="$dir/$stem.pom" -Dpackaging=pom)
  else
    args+=(-Dfile="$dir/$stem.jar" -Dsources="$dir/$stem-sources.jar" -Djavadoc="$dir/$stem-javadoc.jar")
  fi
  mvn --batch-mode --no-transfer-progress --strict-checksums org.apache.maven.plugins:maven-deploy-plugin:3.1.4:deploy-file "${args[@]}"
done
