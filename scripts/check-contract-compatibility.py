#!/usr/bin/env python3
import hashlib, json, pathlib, sys

root = pathlib.Path(__file__).resolve().parents[1]
contract_dir = root / "contracts/src/main/resources/contracts/phase0/v0.1"
baseline_path = root / "contracts/compatibility/v0.1-git-blob-sha1.json"
baseline = json.loads(baseline_path.read_text())

current = {p.name for p in contract_dir.glob("*.json")}
expected = set(baseline)
if current != expected:
    print("v0.1 contract file set changed", file=sys.stderr)
    print("added:", sorted(current-expected), file=sys.stderr)
    print("removed:", sorted(expected-current), file=sys.stderr)
    sys.exit(1)

for name, expected_sha in sorted(baseline.items()):
    data = (contract_dir / name).read_bytes()
    header = f"blob {len(data)}\0".encode()
    actual = hashlib.sha1(header + data).hexdigest()
    if actual != expected_sha:
        print(f"immutable v0.1 contract changed: {name}", file=sys.stderr)
        print(f"expected {expected_sha}, got {actual}", file=sys.stderr)
        sys.exit(1)

print(f"Contract compatibility baseline: {len(baseline)} immutable v0.1 files OK")
