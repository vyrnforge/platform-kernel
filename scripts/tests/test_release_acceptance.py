#!/usr/bin/env python3
"""Offline negative tests for the release acceptance record and tag-order guard."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("capaud_release_gate", ROOT / "scripts" / "check-release-acceptance.py")
assert spec is not None and spec.loader is not None
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def sample_record():
    reviews = {
        role: {
            "status": "accepted",
            "reviewer": "security-reviewer" if role == "security"
            else ("api-reviewer" if role == "api_compatibility"
                  else "product-reviewer" if role == "product"
                  else "reviewer-" + role.replace("_", "-")),
            "reviewed_on": "2026-11-20",
            "evidence": "https://github.com/vyrnforge/platform-kernel/issues/119",
        }
        for role in gate.REQUIRED_REVIEWS
    }
    return {
        "schema_version": 1,
        "version": "0.4.0",
        "status": "approved",
        "decision_id": "DEC-K999",
        "decision_evidence": "https://github.com/vyrnforge/platform-kernel/issues/118",
        "reviews": reviews,
        "compatibility_deltas": {
            case: {
                "resolution": "retain",
                "migration_evidence": "https://github.com/vyrnforge/platform-kernel/issues/119",
            }
            for case in gate.KNOWN_BEHAVIOR_DELTAS
        },
    }


def write_record(root: Path, payload=None, version="0.4.0"):
    (root / "VERSION").write_text(version + "\n", encoding="utf-8")
    directory = root / "docs" / "releases" / "acceptance"
    directory.mkdir(parents=True, exist_ok=True)
    (directory / (version + ".json")).write_text(json.dumps(payload or sample_record()), encoding="utf-8")


class ReleaseEvidenceGateTest(unittest.TestCase):
    def test_approved_sample_fields_are_valid_but_not_authenticated(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            write_record(root)
            outcome = gate.validate(root)
            self.assertEqual(outcome["review_roles_present"], 6)
            self.assertEqual(outcome["known_deltas_dispositioned"], 6)
            self.assertIn("HUMAN_AUTHENTICITY_NOT_VERIFIED", outcome["status"])

    def test_absent_manifest_and_existing_published_version_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root / "VERSION").write_text("0.4.0\n")
            with self.assertRaisesRegex(ValueError, "missing owner-reviewed"):
                gate.validate(root)
            (root / "VERSION").write_text("0.3.2\n")
            with self.assertRaisesRegex(ValueError, "cannot be republished"):
                gate.validate(root)

    def test_pending_or_version_mismatch_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            record = sample_record()
            record["status"] = "pending"
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "not approved"):
                gate.validate(root)
            record["status"] = "approved"
            record["version"] = "0.4.1"
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "schema/version mismatch"):
                gate.validate(root)

    def test_missing_or_unapproved_security_and_product_reviews_fail(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            record = sample_record()
            record["reviews"]["security"]["status"] = "pending"
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "security review not accepted"):
                gate.validate(root)
            del record["reviews"]["operational_recovery"]
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "exact named"):
                gate.validate(root)

    def test_reused_product_reviewer_cannot_claim_security_or_api_review(self):
        for role in ("security", "api_compatibility"):
            with self.subTest(role=role), tempfile.TemporaryDirectory() as td:
                root = Path(td)
                record = sample_record()
                record["reviews"][role]["reviewer"] = record["reviews"]["product"]["reviewer"]
                write_record(root, record)
                with self.assertRaisesRegex(ValueError, "cannot be the Product Owner"):
                    gate.validate(root)

    def test_missing_compatibility_case_or_unreviewed_resolution_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            record = sample_record()
            del record["compatibility_deltas"]["fingerprint_513"]
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "all six"):
                gate.validate(root)
            record["compatibility_deltas"]["fingerprint_513"] = {
                "resolution": "defer",
                "migration_evidence": "https://github.com/vyrnforge/platform-kernel/issues/119",
            }
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "retain or rework"):
                gate.validate(root)

    def test_untrusted_or_missing_evidence_url_fails(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            record = sample_record()
            record["reviews"]["security"]["evidence"] = "http://example.com/fake"
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "HTTPS"):
                gate.validate(root)
            record["reviews"]["security"]["evidence"] = "https://alice:token@example.com/"
            write_record(root, record)
            with self.assertRaisesRegex(ValueError, "HTTPS"):
                gate.validate(root)

    def test_release_workflow_never_reserves_tag_before_preflight_or_build(self):
        source = (ROOT / ".github" / "workflows" / "release.yml").read_text(encoding="utf-8")
        approval = source.index("python3 scripts/check-release-acceptance.py")
        build = source.index("- name: Build and verify once")
        tag = source.index("- name: Reserve exact source tag")
        signing = source.index("- name: Sign release bundle")
        self.assertLess(build, approval)
        self.assertLess(approval, tag)
        self.assertLess(tag, signing)


if __name__ == "__main__":
    unittest.main()
