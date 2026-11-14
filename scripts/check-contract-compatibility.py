#!/usr/bin/env python3
import hashlib, json, pathlib, sys

root = pathlib.Path(__file__).resolve().parents[1]
contracts_root = root / "contracts/src/main/resources/contracts/phase0"
v01 = contracts_root / "v0.1"
v02 = contracts_root / "v0.2"
baseline_path = root / "contracts/compatibility/v0.1-git-blob-sha1.json"
released_baseline_path = root / "contracts/compatibility/v0.2-git-blob-sha1.json"
baseline = json.loads(baseline_path.read_text())
released_baseline = json.loads(released_baseline_path.read_text())

def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)

current = {p.name for p in v01.glob("*.json")}
expected = set(baseline)
if current != expected:
    fail(f"v0.1 contract file set changed; added={sorted(current-expected)} removed={sorted(expected-current)}")

for name, expected_sha in sorted(baseline.items()):
    data = (v01 / name).read_bytes()
    header = f"blob {len(data)}\0".encode()
    actual = hashlib.sha1(header + data).hexdigest()
    if actual != expected_sha:
        fail(f"immutable v0.1 contract changed: {name}; expected {expected_sha}, got {actual}")

released = {p.name for p in v02.glob("*.json")}
if released != current:
    fail(f"v0.2 file set must match v0.1; added={sorted(released-current)} removed={sorted(current-released)}")

if set(released_baseline) != released:
    fail("v0.2 released baseline file set does not match contract package")

for name, expected_sha in sorted(released_baseline.items()):
    data = (v02 / name).read_bytes()
    header = f"blob {len(data)}\\0".encode()
    actual = hashlib.sha1(header + data).hexdigest()
    if actual != expected_sha:
        fail(f"immutable v0.2 released contract changed: {name}; expected {expected_sha}, got {actual}")

manifest = json.loads((v02 / "contract-manifest.json").read_text())
if manifest.get("version") != "0.2.0" or manifest.get("status") != "released":
    fail("v0.2 contract manifest must declare version 0.2.0 and status released")

for name in sorted(current - {"contract-manifest.json"}):
    old = (v01 / name).read_text()
    new = (v02 / name).read_text()
    normalized = new.replace("/phase0/v0.2/", "/phase0/v0.1/")
    if normalized != old:
        fail(f"v0.2 contract is not wire-compatible with v0.1 draft baseline: {name}")

print(f"Contract compatibility: {len(baseline)} immutable v0.1 files and {len(released_baseline)} immutable released v0.2 files OK")
