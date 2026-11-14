#!/usr/bin/env python3
import hashlib, json, pathlib, sys

root = pathlib.Path(__file__).resolve().parents[1]
contracts_root = root / "contracts/src/main/resources/contracts/phase0"
v01 = contracts_root / "v0.1"
v02 = contracts_root / "v0.2"
baseline_path = root / "contracts/compatibility/v0.1-git-blob-sha1.json"
baseline = json.loads(baseline_path.read_text())

def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)

def normalized_text(path):
    return path.read_text().replace("\r\n", "\n").replace("\r", "\n")

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

for name in sorted(current - {"contract-manifest.json"}):
    old = normalized_text(v01 / name)
    new = normalized_text(v02 / name)
    expected_v02 = old.replace("/phase0/v0.1/", "/phase0/v0.2/")
    if new != expected_v02:
        fail(f"released v0.2 contract drifted from immutable v0.1 semantics: {name}")

old_manifest = json.loads((v01 / "contract-manifest.json").read_text())
released_manifest = json.loads((v02 / "contract-manifest.json").read_text())
expected_manifest = dict(old_manifest)
expected_manifest["version"] = "0.2.0"
expected_manifest["status"] = "released"
expected_manifest["date"] = "2026-11-14"
expected_manifest["canonical_document_version"] = "0.2"
expected_manifest["governing_decisions"] = [
    *old_manifest["governing_decisions"],
    "DEC-K013",
]
expected_manifest["release_notes"] = (
    "V2 released contract package. Semantics are compatible with the Phase 0 "
    "v0.1 draft; v0.1 remains immutable historical draft."
)

if released_manifest != expected_manifest:
    fail("released v0.2 contract manifest differs from the approved release transformation")

print(
    f"Contract compatibility: {len(baseline)} immutable v0.1 files and "
    "released v0.2 transformation OK"
)
