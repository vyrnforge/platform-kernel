#!/usr/bin/env bash
set -euo pipefail
version="$(tr -d '[:space:]' < VERSION)"
token="$(printf '%s:%s' "$CENTRAL_USERNAME" "$CENTRAL_PASSWORD" | base64 -w0)"
echo "::add-mask::$token"
api="https://central.sonatype.com/api/v1/publisher"
# Never retry the upload POST automatically: it can create a second deployment.
id="$(curl --silent --show-error --fail-with-body --max-time 120 \
  -H "Authorization: Bearer $token" \
  -F "bundle=@$RUNNER_TEMP/central-bundle.zip;type=application/octet-stream" \
  "$api/upload?name=platform-kernel-$version&publishingType=AUTOMATIC")"
[[ "$id" =~ ^[0-9a-fA-F-]{36}$ ]] || { echo "Unexpected deployment ID; inspect Portal"; exit 1; }
echo "Central deployment ID: $id"
echo "Central deployment: $id" >> "$GITHUB_STEP_SUMMARY"
for attempt in $(seq 1 120); do
  status="$(curl --silent --show-error --fail --max-time 30 -X POST \
    -H "Authorization: Bearer $token" "$api/status?id=$id")"
  state="$(jq -r '.deploymentState' <<< "$status")"
  echo "Central: $state"
  case "$state" in
    PUBLISHED) exit 0 ;;
    FAILED) echo "Central validation failed; inspect Portal deployment $id"; exit 1 ;;
    PENDING|VALIDATING|VALIDATED|PUBLISHING) sleep 15 ;;
    *) echo "Unexpected Central state; inspect deployment $id"; exit 1 ;;
  esac
done
echo "Central publication not confirmed; inspect deployment $id before retrying."
exit 1
