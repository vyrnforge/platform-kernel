#!/usr/bin/env python3
"""CAPAUD-01: permanent, read-only exported JVM signature regression gate.

Compares immutable v0.3.2 Maven Central runtime JARs (pinned SHA-256)
to development-tree Maven-built runtime JARs. No publication or mutation.
Do not confuse JVM signature compatibility with behavior/serialization compatibility.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
VERSION = "0.3.2"
GROUP = "https://repo.maven.apache.org/maven2/io/github/vyrnforge"
ARTIFACTS = {
    "platform-kernel": (
        "platform-kernel",
        "88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e",
    ),
    "platform-kernel-jdbc": (
        "kernel-persistence-jdbc",
        "f10b134fce8a5ff7836a271d9e3764f2d9fcb029e1296d7d1042ad1f4575bf55",
    ),
    "platform-kernel-testkit": (
        "kernel-testkit",
        "64b2ace00419bc4364fddebc55d466e736fc8f7d5c17d1bc9e53c4593856807d",
    ),
}

def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def retrieve_published(name: str, expected_sha: str, location: Path) -> None:
    url = f"{GROUP}/{name}/{VERSION}/{name}-{VERSION}.jar"
    # No tokens, redirect-following authentication or mutable workflow artifacts.
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "capaud-01-read-only/1"}), timeout=45) as response:
        if response.geturl() != url or response.status != 200:
            raise RuntimeError(f"untrusted Central response for {name}")
        data = response.read(10_000_001)
        if len(data) > 10_000_000:
            raise RuntimeError(f"unexpected published artifact size for {name}")
    location.write_bytes(data)
    actual_sha = sha256(location)
    if actual_sha != expected_sha:
        raise RuntimeError(f"published {name} SHA256 differs from pinned release: {actual_sha}")

def classes(path: Path) -> set[str]:
    with zipfile.ZipFile(path) as jar:
        result = set()
        for item in jar.namelist():
            if not item.endswith(".class") or item.endswith("/module-info.class") or item.endswith("/package-info.class"):
                continue
            result.add(item[:-6].replace("/", "."))
        return result

def declarations(jar: Path, cls: str) -> tuple[bool, tuple[str, ...]]:
    result = subprocess.run(
        ["javap", "-classpath", str(jar), "-protected", "-s", "-constants", cls],
        capture_output=True, text=True, check=False, timeout=25
    )
    if result.returncode:
        raise RuntimeError(f"javap failed: {jar.name} {cls}: {result.stderr[:300]}")
    lines = [re.sub(r"\s+", " ", s.strip())
             for s in result.stdout.splitlines()
             if s.strip() and not s.startswith("Compiled from ")]
    if not lines:
        raise RuntimeError(f"javap returned no declarations for {cls}")
    first = next((x for x in lines if re.search(r"\b(class|record|interface|enum)\b", x)), "")
    # Include public/protected nested and top-level types. Package-private internals
    # are also parsed to catch inspectability problems but excluded from exported ABI.
    exported = first.startswith(("public ", "protected "))
    return exported, tuple(x for x in lines if x not in ("{", "}") and x != "static {};")

def main() -> None:
    if (ROOT / "VERSION").read_text().strip() != VERSION:
        raise RuntimeError("development VERSION changed; reapprove audit baseline")
    out = {}
    overall_removed = []
    overall_added = []
    with tempfile.TemporaryDirectory(prefix="capaud-abi-") as tmp:
        temp = Path(tmp)
        for name, (module, published_sha) in ARTIFACTS.items():
            published = temp / f"{name}-{VERSION}-published.jar"
            candidate = ROOT / module / "target" / f"{name}-{VERSION}.jar"
            if not candidate.is_file():
                raise RuntimeError(f"missing exact built candidate {candidate}")
            retrieve_published(name, published_sha, published)
            before_classes, after_classes = classes(published), classes(candidate)
            all_classes = sorted(before_classes | after_classes)
            added, removed, changed = [], [], []
            exported_before, exported_after = 0, 0
            for cls in all_classes:
                older = declarations(published, cls) if cls in before_classes else None
                newer = declarations(candidate, cls) if cls in after_classes else None
                if older is not None and older[0]:
                    exported_before += 1
                if newer is not None and newer[0]:
                    exported_after += 1
                if older is None:
                    if newer[0]:
                        added.append({"class": cls, "kind": "new-exported-type", "members": list(newer[1])})
                    continue
                if newer is None:
                    if older[0]:
                        removed.append({"class": cls, "kind": "removed-exported-type", "members": list(older[1])})
                    continue
                if not (older[0] or newer[0]):
                    continue
                old_symbols, new_symbols = set(older[1]), set(newer[1])
                withdrawn = sorted(old_symbols - new_symbols)
                introduced = sorted(new_symbols - old_symbols)
                if withdrawn or introduced:
                    changed.append({"class": cls, "removed": withdrawn, "added": introduced})
                    if withdrawn:
                        overall_removed.extend(f"{name}::{cls}: {x}" for x in withdrawn)
                    if introduced:
                        overall_added.extend(f"{name}::{cls}: {x}" for x in introduced)
            out[name] = {
                "published_sha256": sha256(published),
                "candidate_sha256": sha256(candidate),
                "all_class_files_published": len(before_classes),
                "all_class_files_candidate": len(after_classes),
                "exported_types_published": exported_before,
                "exported_types_candidate": exported_after,
                "added_exported_types": added,
                "removed_exported_types": removed,
                "changed_exported_type_signatures": changed,
            }
            print("CAPAUD_ARTIFACT " + json.dumps({
                "artifact": name,
                "published_sha256": out[name]["published_sha256"],
                "candidate_sha256": out[name]["candidate_sha256"],
                "exported_types_published": exported_before,
                "exported_types_candidate": exported_after,
                "added_exported_types": len(added),
                "removed_exported_types": len(removed),
                "changed_exported_types": len(changed),
            }, sort_keys=True), flush=True)
            for item in added:
                print("CAPAUD_ADDED_TYPE " + json.dumps({"artifact": name, **item}, sort_keys=True), flush=True)
            for item in removed:
                print("CAPAUD_REMOVED_TYPE " + json.dumps({"artifact": name, **item}, sort_keys=True), flush=True)
            for item in changed:
                print("CAPAUD_CHANGED_SIGNATURE " + json.dumps({"artifact": name, **item}, sort_keys=True), flush=True)
        print("CAPAUD_SUMMARY " + json.dumps({
            "source_sha": os.getenv("CAPAUD_SOURCE_SHA", "unknown"),
            "published_version": VERSION,
            "artifacts": len(out),
            "removed_signature_lines": len(overall_removed),
            "added_signature_lines": len(overall_added),
            "warning": "Compatibility regression test only. Not a release, source-level, serialization, semantic or independent QA approval",
        }, sort_keys=True), flush=True)
        if overall_removed or any(item["removed_exported_types"] for item in out.values()):
            raise SystemExit("CAPAUD_ABI: exported JVM signatures were removed/changed; review before release")

if __name__ == "__main__":
    main()
