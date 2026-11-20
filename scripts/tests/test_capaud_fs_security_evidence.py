#!/usr/bin/env python3
"""Offline adversarial fixtures for CAPAUD-03 File Storage source-CI evidence parser."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("capaud_fs_reports", ROOT / "scripts" / "check-file-storage-security-evidence.py")
assert spec is not None and spec.loader is not None
checker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)


def make_fixture(backend: Path, statuses: dict[tuple[str, str], str] | None = None):
    statuses = statuses or {}
    for (module, classname), methods in checker.REQUIRED.items():
        folder = backend / module / "target" / "surefire-reports"
        folder.mkdir(parents=True, exist_ok=True)
        root = ET.Element("testsuite", name=classname, tests=str(len(methods)))
        for method in methods:
            case = ET.SubElement(root, "testcase", classname=classname, name=method)
            status = statuses.get((classname, method))
            if status:
                ET.SubElement(case, status, message="fixture")
        ET.ElementTree(root).write(folder / f"TEST-{classname}.xml", encoding="utf-8", xml_declaration=True)


class FileStorageSecurityEvidenceTest(unittest.TestCase):
    def test_exact_required_methods_pass(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            make_fixture(root)
            result = checker.verify(root)
            self.assertEqual(result["evidence_level"], "SOURCE_PINNED_TEST_REPORTS_ONLY")
            self.assertEqual(result["required_tests_passed"], 20)
            self.assertEqual(len(result["required_classes"]), 6)

    def test_missing_report_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            make_fixture(root)
            (root / "file-storage-security" / "target" / "surefire-reports" /
                "TEST-io.vyrnforge.filestorage.security.SecuredFilesTest.xml").unlink()
            with self.assertRaisesRegex(ValueError, "report missing"):
                checker.verify(root)

    def test_skipped_failed_and_errored_cases_all_fail(self):
        classname = "io.vyrnforge.filestorage.security.WyrmgateJwtVerifierTest"
        name = "j05_rotationOverlapThenRemoval"
        for status in ("skipped", "failure", "error"):
            with self.subTest(status=status), tempfile.TemporaryDirectory() as td:
                root = Path(td)
                make_fixture(root, {(classname, name): status})
                with self.assertRaisesRegex(ValueError, "failed or skipped"):
                    checker.verify(root)

    def test_duplicate_and_unlisted_cases_do_not_satisfy_requirement(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            make_fixture(root)
            path = (root / "file-storage-runtime" / "target" / "surefire-reports" /
                "TEST-io.vyrnforge.filestorage.runtime.RuntimeContractTest.xml")
            xml = ET.parse(path)
            original = xml.getroot().find("testcase")
            original.set("name", "unrelated")
            xml.write(path, encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "missing or repeated"):
                checker.verify(root)

    def test_nonreport_and_missing_backend_fail_closed(self):
        with tempfile.TemporaryDirectory() as td:
            with self.assertRaisesRegex(ValueError, "directory is absent"):
                checker.verify(Path(td) / "not-here")


if __name__ == "__main__":
    unittest.main()
