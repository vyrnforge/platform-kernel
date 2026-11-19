"""Unit checks for the bounded DOCSEC publication scanner (no credentials)."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from zipfile import ZipFile

PATH = Path(__file__).resolve().parents[1] / "check-docsec-publication.py"
SPEC = spec_from_file_location("docsec", PATH)
mod = module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


class PublicationGateTests(unittest.TestCase):
    def test_public_security_guarantees_are_not_flagged(self):
        safe = b"Authentication verified, tenant membership, DENIED 403, outbox replay, ACQUIRED and REPLAY."
        self.assertEqual(mod.violations("safe", safe), [])

    def test_restricted_marker_detected_without_disclosure(self):
        sample = b"DOCSEC-RESTRICTED-CONTENT: do not publish"
        found = mod.violations("site", sample)
        self.assertEqual(len(found), 1)
        self.assertNotIn("do not publish", found[0])

    def test_key_literal_and_retired_trace_are_rejected(self):
        self.assertEqual(len(mod.violations("site", b"-----BEGIN PRIVATE KEY-----")), 1)
        self.assertEqual(len(mod.violations("bundle", mod.RETIRED_UI_STRINGS[0], website_bundle=True)), 1)
        self.assertFalse(mod.violations("source", mod.RETIRED_UI_STRINGS[0]))

    def test_private_document_extension_rejected_in_jars(self):
        with TemporaryDirectory() as tmp:
            archive = Path(tmp) / "test.jar"
            with ZipFile(archive, "w") as jar:
                jar.writestr("META-INF/MANIFEST.MF", "Manifest-Version: 1.0")
                jar.writestr("internal/decision.mermaid", "graph TD; A-->B")
            errors, entries = mod.inspect_jar(archive)
            self.assertEqual(len(errors), 1)
            self.assertIn("forbidden restricted-document package path", errors[0])
            self.assertEqual(entries, 0)


if __name__ == "__main__":
    unittest.main()
