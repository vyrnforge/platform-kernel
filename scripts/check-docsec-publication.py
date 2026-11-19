#!/usr/bin/env python3
"""Bounded public-disclosure gate. Only reports file names, never matched values.

This cannot certify secrets absent, review Git history, or classify implementation.
Security review and human release decisions remain separate.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parent.parent
MARKERS = (b"DOCSEC-RESTRICTED-CONTENT", b"DOCSEC-INTERNAL-ONLY-CONTENT")
CREDENTIAL_LITERALS = (
    re.compile(rb"-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----"),
    re.compile(rb"AKIA[0-9A-Z]{16}"),
    re.compile(rb"gh[pousr]_[A-Za-z0-9]{25,}"),
    re.compile(rb"xox[baprs]-[A-Za-z0-9-]{20,}"),
    re.compile(rb"sk_live_[A-Za-z0-9]{16,}"),
)
PROHIBITED_SUFFIXES = (".mmd", ".mermaid", ".drawio", ".puml", ".pem", ".key", ".env", ".p12", ".pfx", ".jks", ".keystore")
RETIRED_UI_STRINGS = (
    b"Not evaluated: the previous gate stopped this request.",
    b"Does ACQUIRED receive one leased transaction and its Connection?",
    b"Stop at the first failure; subsequent gates were never called.",
)

# Restrict *public website content* to supported usage and behavior.
# These are targeted regression checks, not exhaustive content classification.
NON_USAGE_SITE_STRINGS = (
    b"first blocked gate",
    b"first stopped gate",
    b"first denied gate",
    b"Scenario / first gate",
    b"What happens for each idempotency decision?",
    b"Deployment patterns",
    b"RequestContextPipeline.tenantless(identityAdapter, domainAuthorizationHook)",
    b"new JacksonRecordCodec(appMapper)",
)



def violations(label: str, data: bytes, *, website_bundle: bool = False, site_content: bool = False) -> list[str]:
    problems = []
    if any(marker in data for marker in MARKERS):
        problems.append(f"{label}: classified-content marker")
    if any(pattern.search(data) for pattern in CREDENTIAL_LITERALS):
        problems.append(f"{label}: possible credential literal (redacted)")
    if website_bundle and any(item in data for item in RETIRED_UI_STRINGS):
        problems.append(f"{label}: internal execution-trace description")
    if (website_bundle or site_content) and any(item in data for item in NON_USAGE_SITE_STRINGS):
        problems.append(f"{label}: non-usage documentation content (redacted)")
    return problems


def scan_source() -> tuple[list[str], int]:
    issues: list[str] = []
    count = 0
    roots = (ROOT / "site" / "src", ROOT / "docs")
    for folder in roots:
        for path in folder.rglob("*"):
            if path.is_file() and path.suffix in {".jsx", ".js", ".mjs", ".html", ".css", ".md"}:
                count += 1
                is_public_content = folder.name == "src" and ".test." not in path.name
                issues.extend(violations(
                    str(path.relative_to(ROOT)), path.read_bytes(), site_content=is_public_content
                ))
    for name in ("README.md", "site/README.md", "SECURITY.md", "CONTRIBUTING.md"):
        path = ROOT / name
        count += 1
        issues.extend(violations(name, path.read_bytes()))
    return issues, count


def scan_site() -> tuple[list[str], dict[str, str]]:
    dist = ROOT / "site" / "dist"
    errors: list[str] = []
    digests: dict[str, str] = {}
    for name in ("index.html", "app.js", "app.css"):
        path = dist / name
        if not path.is_file():
            errors.append(f"site/dist/{name}: required generated public asset missing")
            continue
        data = path.read_bytes()
        errors.extend(violations(f"site/dist/{name}", data, website_bundle=name == "app.js"))
        digests[name] = hashlib.sha256(data).hexdigest()
    return errors, digests


def inspect_jar(path: Path) -> tuple[list[str], int]:
    errors: list[str] = []
    inspected = 0
    with ZipFile(path) as archive:
        for entry in archive.infolist():
            if entry.is_dir():
                continue
            name = entry.filename.lower()
            if any(name.endswith(x) for x in PROHIBITED_SUFFIXES) or "/private/" in name or "/restricted/" in name:
                errors.append(f"{path.name}: forbidden restricted-document package path")
            if entry.file_size > 4_000_000:
                errors.append(f"{path.name}: oversized entry requires manual inspection")
                continue
            # Scan binary .class constants as well: public JAR bytecode is inspectable,
            # and token/marker strings need not live in separate resource files.
            inspected += 1
            errors.extend(violations(f"{path.name}/{entry.filename}", archive.read(entry)))
    return errors, inspected


def scan_jars(version: str) -> tuple[list[str], dict[str, str], int]:
    errors: list[str] = []
    digests: dict[str, str] = {}
    count = 0
    modules = (
        ("platform-kernel", "platform-kernel"),
        ("kernel-persistence-jdbc", "platform-kernel-jdbc"),
        ("kernel-testkit", "platform-kernel-testkit"),
    )
    for directory, artifact in modules:
        for suffix in (".jar", "-sources.jar", "-javadoc.jar"):
            name = f"{artifact}-{version}{suffix}"
            path = ROOT / directory / "target" / name
            if not path.is_file():
                errors.append(f"{directory}/target/{name}: expected release-docs package missing")
                continue
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            digests[name] = digest
            jar_errors, n = inspect_jar(path)
            errors.extend(jar_errors)
            count += n
    return errors, digests, count


def main() -> int:
    parser = argparse.ArgumentParser(description="No-secret-output disclosure checker")
    parser.add_argument("--source", action="store_true")
    parser.add_argument("--site", action="store_true")
    parser.add_argument("--jars", action="store_true")
    parser.add_argument("--version", default=None, help="validated release version; defaults to VERSION")
    args = parser.parse_args()
    if not any((args.source, args.site, args.jars)):
        parser.error("select at least one of --source, --site, --jars")
    errors: list[str] = []
    report: dict = {"gate": "DOCSEC bounded detection only", "manual_security_review_required": True}
    if args.source:
        found, n = scan_source()
        errors.extend(found)
        report["source_files_inspected"] = n
    if args.site:
        found, digests = scan_site()
        errors.extend(found)
        report["site_sha256"] = digests
    if args.jars:
        version = args.version or (ROOT / "VERSION").read_text().strip()
        if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
            parser.error("invalid release version")
        found, digests, n = scan_jars(version)
        errors.extend(found)
        report["jar_sha256"] = digests
        report["jar_text_entries_inspected"] = n
    report["status"] = "FAIL" if errors else "PASS"
    report["findings"] = len(errors)
    print("DOCSEC_PUBLICATION " + json.dumps(report, sort_keys=True))
    for error in errors:
        print("DOCSEC_FINDING " + error, file=sys.stderr)
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
