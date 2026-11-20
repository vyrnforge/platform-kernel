#!/usr/bin/env python3
"""Adversarial self-tests for proposed contracts/runtime package boundary."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("kernel_packages", ROOT/"scripts"/"check-package-boundaries.py")
assert spec and spec.loader
kernel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kernel)


def create_tree(root: Path) -> Path:
    base = root/"platform-kernel"/"src"/"main"/"java"/"io"/"vyrnforge"/"platform"/"kernel"
    for name in kernel.CONTRACT_PACKAGES | kernel.RUNTIME_PACKAGES:
        parent = base/name
        parent.mkdir(parents=True, exist_ok=True)
        (parent/"Example.java").write_text(
            f"package io.vyrnforge.platform.kernel.{name};\npublic final class Example {{}}\n",
            encoding="utf-8",
        )
    return base


class PackageBoundaryTest(unittest.TestCase):
    def test_all_currently_classified_packages_are_covered(self):
        self.assertEqual(len(kernel.CONTRACT_PACKAGES), 12)
        self.assertEqual(len(kernel.RUNTIME_PACKAGES), 5)
        self.assertFalse(kernel.CONTRACT_PACKAGES & kernel.RUNTIME_PACKAGES)

    def test_valid_lower_to_higher_dependency_direction(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=create_tree(root)
            (base/"http"/"Example.java").write_text(
                "package io.vyrnforge.platform.kernel.http;\n"
                "import io.vyrnforge.platform.kernel.context.TenantContext;\n"
                "public final class Example {}\n"
            )
            result=kernel.check(root)
            self.assertEqual(result["source_files_checked"], 17)
            self.assertEqual(result["contract_sources"], 12)
            self.assertEqual(result["runtime_sources"], 5)

    def test_contract_to_runtime_import_rejected(self):
        for statement in (
            "import io.vyrnforge.platform.kernel.pipeline.RequestContextPipeline;",
            "import static io.vyrnforge.platform.kernel.http.HttpRequestMetadata.BEARER;",
        ):
            with self.subTest(statement=statement), tempfile.TemporaryDirectory() as td:
                root=Path(td)
                base=create_tree(root)
                (base/"context"/"Example.java").write_text(
                    "package io.vyrnforge.platform.kernel.context;\n"+statement+
                    "\npublic final class Example {}\n"
                )
                with self.assertRaisesRegex(ValueError, "contracts import runtime"):
                    kernel.check(root)

    def test_unclassified_new_package_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=create_tree(root)
            d=base/"surprise"
            d.mkdir()
            (d/"Example.java").write_text(
                "package io.vyrnforge.platform.kernel.surprise;\npublic final class Example {}\n"
            )
            with self.assertRaisesRegex(ValueError, "unclassified package"):
                kernel.check(root)

    def test_bad_java_package_declaration_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=create_tree(root)
            (base/"event"/"Example.java").write_text(
                "package io.vyrnforge.platform.kernel.audit;\npublic final class Example {}\n"
            )
            with self.assertRaisesRegex(ValueError, "package declaration"):
                kernel.check(root)

    def test_missing_contract_source_package_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td)
            base=create_tree(root)
            (base/"file"/"Example.java").unlink()
            with self.assertRaisesRegex(ValueError, "classified package"):
                kernel.check(root)


if __name__ == "__main__":
    unittest.main()
