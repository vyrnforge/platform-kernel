#!/usr/bin/env python3
"""Verify previously released public v0.3.2 Maven artifacts with zero credentials.

This checks their accessible *current bytes*, not historical copies or caches.
Output contains SHA-256 digests and sanitized file-level findings only.
"""
from __future__ import annotations

import hashlib
from importlib.util import module_from_spec, spec_from_file_location
import json
from pathlib import Path
import tempfile
from urllib.error import URLError, HTTPError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parent.parent
SPEC = spec_from_file_location("docsec", ROOT / "scripts" / "check-docsec-publication.py")
SCANNER = module_from_spec(SPEC)
SPEC.loader.exec_module(SCANNER)

VERSION = "0.3.2"
ARTIFACTS = ("platform-kernel", "platform-kernel-jdbc", "platform-kernel-testkit")
MAVEN_BASE = "https://repo.maven.apache.org/maven2/io/github/vyrnforge"
RELEASED_SHA256 = {
    "platform-kernel-0.3.2.jar": "88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e",
    "platform-kernel-jdbc-0.3.2.jar": "f10b134fce8a5ff7836a271d9e3764f2d9fcb029e1296d7d1042ad1f4575bf55",
    "platform-kernel-testkit-0.3.2.jar": "64b2ace00419bc4364fddebc55d466e736fc8f7d5c17d1bc9e53c4593856807d",
}


def main() -> int:
    errors = []
    artifacts = {}
    entries = 0
    with tempfile.TemporaryDirectory(prefix="docsec-release-") as directory:
        for artifact in ARTIFACTS:
            for suffix in (".jar", "-sources.jar", "-javadoc.jar"):
                name = f"{artifact}-{VERSION}{suffix}"
                url = f"{MAVEN_BASE}/{artifact}/{VERSION}/{name}"
                try:
                    with urlopen(url, timeout=25) as response:
                        data = response.read(20_000_000)
                except (HTTPError, URLError, TimeoutError) as error:
                    errors.append(f"{name}: public artifact fetch failed ({type(error).__name__})")
                    continue
                digest = hashlib.sha256(data).hexdigest()
                artifacts[name] = {"sha256": digest, "bytes": len(data)}
                expected = RELEASED_SHA256.get(name)
                if expected and expected != digest:
                    errors.append(f"{name}: Central artifact hash differs from verified GitHub release asset")
                path = Path(directory) / name
                path.write_bytes(data)
                try:
                    found, n = SCANNER.inspect_jar(path)
                    errors.extend(found)
                    entries += n
                except Exception as error:
                    errors.append(f"{name}: archive inspection failed ({type(error).__name__})")
    report = {
        "release": VERSION,
        "inspected_artifacts": len(artifacts),
        "inspected_entries": entries,
        "artifact_digests": artifacts,
        "status": "FAIL" if errors else "PASS",
        "manual_security_review_required": True,
        "historical_caches_not_assessed": True,
    }
    print("DOCSEC_RELEASED_V032 " + json.dumps(report, sort_keys=True))
    for error in errors:
        print("DOCSEC_FINDING " + error)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
