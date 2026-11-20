#!/usr/bin/env python3
"""Offline guardrails for CAPAUD-01's immutable-release regression checks."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / "scripts"


def module(filename: str, name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / filename)
    assert spec is not None and spec.loader is not None
    loaded = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(loaded)
    return loaded


class CompatibilityGateTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.abi = module("capaud-abi-compare.py", "capaud_abi")
        cls.behavior = module("capaud-behavior-compare.py", "capaud_behavior")

    def test_published_sha_and_three_distributed_artifacts_are_pinned(self):
        self.assertEqual(set(self.abi.ARTIFACTS), {
            "platform-kernel", "platform-kernel-jdbc", "platform-kernel-testkit"
        })
        self.assertEqual(self.abi.VERSION, "0.3.2")
        self.assertEqual(
            self.abi.ARTIFACTS["platform-kernel"][1], self.behavior.RELEASE_SHA
        )
        self.assertEqual(self.behavior.RELEASE_SHA,
            "88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e")

    def test_known_six_differences_are_not_considered_release_approval(self):
        matrix = self.behavior.EXPECTED
        self.assertEqual(len(matrix), 11)
        self.assertEqual(sum(a != b for a, b in matrix.values()), 6)
        before = {name: pair[0] for name, pair in matrix.items()}
        after = {name: pair[1] for name, pair in matrix.items()}
        divergences = self.behavior.require_expected_matrix(before, after)
        self.assertEqual(len(divergences), 6)
        self.assertEqual({d["case"] for d in divergences}, {
            "module_underscore", "module_129", "policy_upper",
            "operation_193", "key_513", "fingerprint_513"
        })

    def test_unreviewed_constructor_behavior_change_fails_closed(self):
        before = {n: p[0] for n, p in self.behavior.EXPECTED.items()}
        after = {n: p[1] for n, p in self.behavior.EXPECTED.items()}
        after["key_512"] = "REJECT"
        with self.assertRaises(AssertionError):
            self.behavior.require_expected_matrix(before, after)
        after["key_512"] = "ACCEPT"
        before.pop("module_129")
        with self.assertRaises(AssertionError):
            self.behavior.require_expected_matrix(before, after)

    def test_abi_jar_class_inventory_includes_nested_types(self):
        with tempfile.TemporaryDirectory() as td:
            jar = Path(td) / "fixture.jar"
            with zipfile.ZipFile(jar, "w") as z:
                z.writestr("io/example/Public.class", b"fixture")
                z.writestr("io/example/Public$Nested.class", b"fixture")
                z.writestr("io/example/package-info.class", b"fixture")
                z.writestr("module-info.class", b"fixture")
            self.assertEqual(self.abi.classes(jar), {
                "io.example.Public", "io.example.Public$Nested"
            })


if __name__ == "__main__":
    unittest.main()
