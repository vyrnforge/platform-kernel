#!/usr/bin/env python3
"""Non-runtime CAPAUD package-boundary check for ADR-0005 Option A.

Current source packages are complete (no Java package is split across a JAR
boundary). This is a bounded Java package/imports audit, not a full bytecode
or qualified Architecture/Security audit and not approval for a fourth JAR.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import re
import sys

PACKAGE_ROOT = "io.vyrnforge.platform.kernel"
CONTRACT_PACKAGES = frozenset({
    "audit", "config", "context", "controls", "errors", "event",
    "feature", "file", "idempotency", "ids", "module", "ports",
})
RUNTIME_PACKAGES = frozenset({
    "health", "http", "identity", "observability", "pipeline",
})
PACKAGE_DECLARATION = re.compile(r"(?m)^\s*package\s+([\w.]+)\s*;")
IMPORT_DECLARATION = re.compile(r"(?m)^\s*import\s+(?:static\s+)?([\w.*]+)\s*;")
PREFIX = PACKAGE_ROOT + "."


def check(root: Path) -> dict[str, object]:
    base = root / "platform-kernel" / "src" / "main" / "java" / Path(*PACKAGE_ROOT.split("."))
    if not base.is_dir():
        raise ValueError("Kernel Java source root is missing")
    files = sorted(base.rglob("*.java"))
    if not files:
        raise ValueError("Kernel Java source tree is empty")

    present: set[str] = set()
    violations: list[str] = []
    totals = {"contracts": 0, "runtime": 0}
    known = CONTRACT_PACKAGES | RUNTIME_PACKAGES

    for file in files:
        relative = file.relative_to(base)
        expected = PACKAGE_ROOT + "." + ".".join(relative.parts[:-1])
        text = file.read_text(encoding="utf-8")
        found = PACKAGE_DECLARATION.search(text)
        if found is None or found.group(1) != expected:
            violations.append(f"{relative}: package declaration does not match source path")
            continue
        package = relative.parts[0]
        if package not in known:
            violations.append(f"{relative}: unclassified package {package}")
            continue
        present.add(package)
        layer = "contracts" if package in CONTRACT_PACKAGES else "runtime"
        totals[layer] += 1

        imports = [m.group(1) for m in IMPORT_DECLARATION.finditer(text)]
        for imported in imports:
            if not imported.startswith(PREFIX):
                continue
            target = imported[len(PREFIX):].split(".")[0]
            if target not in known:
                violations.append(f"{relative}: imported an unclassified Kernel package {target}")
            elif layer == "contracts" and target in RUNTIME_PACKAGES:
                violations.append(f"{relative}: contracts import runtime package {target}")

    missing = known - present
    if missing:
        violations.append("classified package(s) absent from source: " + ", ".join(sorted(missing)))

    if violations:
        raise ValueError("; ".join(violations[:20]))

    return {
        "status": "JAVA_PACKAGE_IMPORT_BOUNDARY_PASS",
        "source_files_checked": len(files),
        "contract_sources": totals["contracts"],
        "runtime_sources": totals["runtime"],
        "contract_package_count": len(CONTRACT_PACKAGES),
        "runtime_package_count": len(RUNTIME_PACKAGES),
        "warning": "This is a source package/import check. It does not move binaries, authorize a new JAR, or replace Java ABI and consumer conformance tests.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    try:
        result = check(args.root)
    except (ValueError, OSError, UnicodeError) as exc:
        print(f"CAPAUD_PACKAGE_BOUNDARY_FAILURE={exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print("CAPAUD_PACKAGE_BOUNDARY=" + json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
