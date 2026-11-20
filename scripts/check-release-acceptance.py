#!/usr/bin/env python3
"""Fail-closed evidence preflight for a *new* Platform Kernel release.

This gate checks required version-specific approval-record fields, not the
authenticity or independence of a human review. The release owner must verify
linked evidence and obtain the separately required release authorization.
Never confuse a passing manifest check with publication permission.
"""
from __future__ import annotations

import argparse
from datetime import date
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit

RELEASED_BASELINE = "0.3.2"
REQUIRED_REVIEWS = (
    "product", "architecture", "api_compatibility", "security",
    "consumer_conformance", "operational_recovery",
)
KNOWN_BEHAVIOR_DELTAS = (
    "module_underscore", "module_129", "policy_upper",
    "operation_193", "key_513", "fingerprint_513",
)
SEMVER = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+$")
REVIEWER = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$")
DECISION = re.compile(r"^DEC-K[0-9]{3,}$")


def require_url(value: object, label: str) -> None:
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError(f"{label} must be a bounded HTTPS evidence URL")
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or not parsed.netloc
            or parsed.username is not None or parsed.password is not None
            or any(ch.isspace() for ch in value)):
        raise ValueError(f"{label} must be a bounded HTTPS evidence URL")


def validate(root: Path) -> dict[str, object]:
    version_file = root / "VERSION"
    if not version_file.is_file():
        raise ValueError("VERSION file missing")
    version = version_file.read_text(encoding="utf-8").strip()
    if not SEMVER.fullmatch(version):
        raise ValueError("release VERSION must be a strict semantic version")
    if version == RELEASED_BASELINE:
        raise ValueError("immutable published v0.3.2 cannot be republished")

    manifest = root / "docs" / "releases" / "acceptance" / f"{version}.json"
    if not manifest.is_file():
        raise ValueError(f"missing owner-reviewed release acceptance record for {version}")
    if manifest.stat().st_size > 20_000:
        raise ValueError("release acceptance record exceeds size limit")
    try:
        data = json.loads(manifest.read_text(encoding="utf-8"))
    except (ValueError, UnicodeError) as exc:
        raise ValueError("invalid release acceptance JSON") from exc
    if not isinstance(data, dict):
        raise ValueError("release acceptance must be a JSON object")
    if data.get("schema_version") != 1 or data.get("version") != version:
        raise ValueError("release acceptance schema/version mismatch")
    if data.get("status") != "approved":
        raise ValueError("release acceptance is not approved")
    if not isinstance(data.get("decision_id"), str) or not DECISION.fullmatch(data["decision_id"]):
        raise ValueError("release-specific canonical decision ID required")
    require_url(data.get("decision_evidence"), "decision_evidence")

    reviews = data.get("reviews")
    if not isinstance(reviews, dict) or set(reviews) != set(REQUIRED_REVIEWS):
        raise ValueError("exact named product/architecture/API/security/consumer/recovery reviews required")
    for role in REQUIRED_REVIEWS:
        review = reviews[role]
        if not isinstance(review, dict) or review.get("status") != "accepted":
            raise ValueError(f"{role} review not accepted")
        reviewer = review.get("reviewer")
        if not isinstance(reviewer, str) or not REVIEWER.fullmatch(reviewer):
            raise ValueError(f"{role} requires a named human reviewer login")
        require_url(review.get("evidence"), f"{role}.evidence")
        reviewed_on = review.get("reviewed_on")
        try:
            if not isinstance(reviewed_on, str):
                raise ValueError("date missing")
            date.fromisoformat(reviewed_on)
        except ValueError as exc:
            raise ValueError(f"{role} requires an ISO review date") from exc

    # A release commit author or a sole maintainer cannot self-certify independent
    # Security and API review through this manifest. A scoped exception needs
    # a separate explicitly reviewed policy change, not a copied old exception.
    product = reviews["product"]["reviewer"].lower()
    if reviews["security"]["reviewer"].lower() == product:
        raise ValueError("security reviewer cannot be the Product Owner reviewer")
    if reviews["api_compatibility"]["reviewer"].lower() == product:
        raise ValueError("API reviewer cannot be the Product Owner reviewer")

    compatibility = data.get("compatibility_deltas")
    if not isinstance(compatibility, dict) or set(compatibility) != set(KNOWN_BEHAVIOR_DELTAS):
        raise ValueError("all six known released-v0.3.2 behavior deltas require explicit disposition")
    for case in KNOWN_BEHAVIOR_DELTAS:
        item = compatibility[case]
        if not isinstance(item, dict) or item.get("resolution") not in ("retain", "rework"):
            raise ValueError(f"{case} requires explicit retain or rework resolution")
        require_url(item.get("migration_evidence"), f"{case}.migration_evidence")

    # Machine verification proves field presence/consistency, NOT that links are
    # accurate or that approvals were issued by independent qualified people.
    return {
        "version": version,
        "decision_id": data["decision_id"],
        "review_roles_present": len(reviews),
        "known_deltas_dispositioned": len(compatibility),
        "status": "MANIFEST_FIELDS_VALID_HUMAN_AUTHENTICITY_NOT_VERIFIED",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args()
    try:
        result = validate(args.root)
    except (ValueError, OSError) as exc:
        print(f"CAPAUD_RELEASE_PREFLIGHT_BLOCKED={exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print("CAPAUD_RELEASE_PREFLIGHT=" + json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
