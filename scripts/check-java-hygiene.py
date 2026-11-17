#!/usr/bin/env python3
"""Dependency-free Java source whitespace hygiene check.

This deliberately avoids mass reformatting historical code and does not impose
a framework, dependency, line-length or code-generation convention.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AREAS = ("platform-kernel", "kernel-persistence-jdbc", "kernel-testkit",
         "consumer-tests", "verification")


def check(path: Path) -> list[str]:
    data = path.read_bytes()
    problems: list[str] = []
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        return [f"{path.relative_to(ROOT)}: not UTF-8"]
    if text and not text.endswith("\n"):
        problems.append("missing final LF")
    if "\r" in text:
        problems.append("CR found (expected LF)")
    for number, line in enumerate(text.splitlines(), 1):
        if "\t" in line:
            problems.append(f"line {number}: tab")
        if line.rstrip(" \t") != line:
            problems.append(f"line {number}: trailing whitespace")
    return [f"{path.relative_to(ROOT)}: {message}" for message in problems]


def main() -> int:
    files = sorted(path for area in AREAS
                   for path in (ROOT / area).rglob("*.java")
                   if path.is_file())
    errors = [error for path in files for error in check(path)]
    for error in errors:
        print(error)
    if errors:
        print(f"Java source hygiene FAILED: {len(errors)} problem(s)")
        return 1
    print(f"Java source hygiene OK: {len(files)} files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
