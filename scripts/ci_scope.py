#!/usr/bin/env python3
"""Fail-closed change scoping for required GitHub checks.

This file is shared by CI, CodeQL and Dependency Review. Their *required* check
names remain present on every PR. Only expensive verification steps are gated.

For pull_request, checkout provides the synthetic test merge commit (HEAD); its
first parent is the exact current base branch. For push, compare the complete
before..after range, not only the last pushed commit.
"""
from __future__ import annotations

import argparse
import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ZERO_SHA = "0" * 40
ROOT_DOCS = frozenset({
    "README.md", "CONTRIBUTING.md", "CHANGELOG.md", "SECURITY.md",
    "LICENSE", ".github/pull_request_template.md",
})

@dataclass(frozen=True)
class Scope:
    library: bool
    codeql: bool
    dependency: bool
    count: int
    reason: str = "changed paths"


def library_sensitive(path: str) -> bool:
    """An allowlist of documentation-only paths; unknown files fail closed."""
    if path.startswith(("docs/contracts/", "docs/releases/recovery/")):
        # Contract/recovery documents are release and compatibility inputs.
        return True
    if path.startswith("site/") or path.startswith("docs/"):
        return False
    if path in ROOT_DOCS or path == ".github/workflows/pages.yml":
        return False
    return True


def dependency_sensitive(path: str) -> bool:
    """Only manifests, lockfiles and supply-chain configuration need PR dep diff."""
    return (
        path == "pom.xml"
        or path.endswith("/pom.xml")
        or path in {".github/dependabot.yml", "site/package.json", "site/package-lock.json"}
        or path.startswith((".github/workflows/", ".github/actions/"))
        or (path.startswith("scripts/") and (
            path.endswith((".lock", ".requirements", "requirements.txt"))
            or Path(path).name.startswith("requirements-")
        ))
    )


def classify(paths: Iterable[str], *, force_full: bool = False,
             reason: str = "changed paths") -> Scope:
    selected = tuple(sorted(set(paths)))
    if force_full or not selected:
        return Scope(True, True, True, len(selected),
                     reason if force_full else "empty or unknown diff: fail closed")
    lib = any(library_sensitive(path) for path in selected)
    deps = any(dependency_sensitive(path) for path in selected)
    # Current CodeQL configuration is *Java/Kotlin only*. Pages JavaScript is
    # verified by the Pages npm/Chromium workflow, not this scanner.
    return Scope(lib, lib, deps, len(selected), reason)


def git(*args: str) -> bytes:
    return subprocess.check_output(["git", *args], stderr=subprocess.DEVNULL)


def changed_paths(event: str, before: str) -> tuple[list[str], str, bool]:
    """Determine the entire change set or explicitly require all checks.

    When checkout/history/diff collection is unavailable, *never* report
    'no library changes'; force full verification instead.
    """
    if event in {"workflow_dispatch", "schedule"}:
        return [], event + ": forced full verification", True

    try:
        if event == "pull_request":
            # GitHub Actions defaults to refs/pull/<n>/merge. Depth 2 is enough
            # to compare that test merge against its first (base) parent.
            base = git("rev-parse", "--verify", "HEAD^1").decode().strip()
        elif event == "push":
            if not re.fullmatch(r"[0-9a-f]{40}", before or "") or before == ZERO_SHA:
                return [], "missing/initial push base: fail closed", True
            base = before
            try:
                git("cat-file", "-e", base + "^{commit}")
            except subprocess.CalledProcessError:
                # Public repo; do not persist checkout credentials. Fetch only
                # the historical before commit needed for the full push diff.
                git("fetch", "--no-tags", "--depth=1", "origin", base)
        else:
            return [], "unknown event: fail closed", True

        data = git("diff", "--no-renames", "--name-only", "-z", base, "HEAD")
        paths = [x.decode("utf-8", "surrogateescape") for x in data.split(b"\0") if x]
        if not paths:
            return [], "empty diff: fail closed", True
        return paths, event + " diff", False
    except (OSError, subprocess.CalledProcessError, UnicodeError):
        return [], "git history/diff unavailable: fail closed", True


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--event", required=True)
    ap.add_argument("--before", default="")
    ap.add_argument("--output", default=os.getenv("GITHUB_OUTPUT"))
    args = ap.parse_args()
    paths, reason, force_full = changed_paths(args.event, args.before)
    scope = classify(paths, force_full=force_full, reason=reason)
    values = {
        "library": str(scope.library).lower(),
        "codeql": str(scope.codeql).lower(),
        "dependency": str(scope.dependency).lower(),
        "files": str(scope.count),
        "reason": scope.reason,
    }
    if args.output:
        with open(args.output, "a", encoding="utf-8") as out:
            for key, value in values.items():
                out.write(f"{key}={value}\n")
    print("CI scope: " + ", ".join(f"{k}={v}" for k, v in values.items()))


if __name__ == "__main__":
    main()
