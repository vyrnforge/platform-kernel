#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/target/local-verify"
rm -rf "$OUT"
mkdir -p "$OUT/classes"

mapfile -t SOURCES < <(find "$ROOT/kernel-core/src/main/java" "$ROOT/kernel-testkit/src/main/java" -name '*.java' -print | sort)
javac --release 21 -d "$OUT/classes" "${SOURCES[@]}" "$ROOT/verification/GoldenPathSmokeTest.java"
java -cp "$OUT/classes" GoldenPathSmokeTest

python3 - <<'PY' "$ROOT/contracts/src/main/resources/contracts/phase0/v0.1"
import json, pathlib, sys
root = pathlib.Path(sys.argv[1])
files = sorted(root.glob('*.json'))
if not files:
    raise SystemExit('no contract JSON files found')
for p in files:
    json.loads(p.read_text())
print(f'Contract JSON parse: {len(files)} files OK')
PY
