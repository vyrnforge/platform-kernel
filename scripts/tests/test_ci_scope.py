"""Contract tests for the repository's required-check scoping."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import subprocess

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ci_scope import ZERO_SHA, changed_paths, classify


class ScopeTests(unittest.TestCase):
    def check(self, paths, library, codeql, dependency):
        actual = classify(paths)
        self.assertEqual((actual.library, actual.codeql, actual.dependency),
                         (library, codeql, dependency), paths)

    def test_site_source_only_uses_pages(self):
        self.check(["site/src/main.jsx", "site/src/style.css"], False, False, False)

    def test_docs_only_never_needs_java(self):
        self.check(["docs/integration/quickstart.md", "README.md"], False, False, False)

    def test_site_manifest_runs_dependency_review_not_java(self):
        self.check(["site/package-lock.json"], False, False, True)
        self.check(["site/package.json", "site/src/main.jsx"], False, False, True)

    def test_pages_workflow_runs_site_and_dependency_not_java(self):
        self.check([".github/workflows/pages.yml"], False, False, True)

    def test_library_code_runs_java_and_java_codeql(self):
        for file in ("platform-kernel/src/main/java/Example.java",
                     "kernel-persistence-jdbc/src/main/java/Example.java",
                     "kernel-testkit/src/test/java/Example.java",
                     "contracts/v2/event.json",
                     "verification/GeneralUsageExample.java",
                     "consumer-tests/pom.xml"):
            with self.subTest(file=file):
                scope = classify([file])
                self.assertTrue(scope.library)
                self.assertTrue(scope.codeql)

    def test_pom_and_release_pipeline_run_all_checks(self):
        for file in ("pom.xml", "kernel-persistence-jdbc/pom.xml",
                     ".github/workflows/ci.yml", ".github/workflows/release.yml",
                     ".github/dependabot.yml"):
            with self.subTest(file=file):
                self.check([file], True, True, True)

    def test_contracts_and_recovery_are_not_dismissed_as_docs_only(self):
        self.check(["docs/contracts/reliability.md"], True, True, False)
        self.check(["docs/releases/recovery/0.3.1.json"], True, True, False)

    def test_lockfile_reviews(self):
        self.check(["scripts/requirements-schema-202012.lock"], True, True, True)

    def test_mixed_change_keeps_each_affected_pipeline(self):
        self.check(["site/src/main.jsx", "platform-kernel/src/main/java/Foo.java",
                    "site/package-lock.json"], True, True, True)

    def test_unknown_paths_are_conservative(self):
        self.check(["unknown-build-configuration.conf"], True, True, False)
        self.check([".github/CODEOWNERS"], True, True, False)

    def test_deleted_renamed_or_empty_diff_fail_closed(self):
        self.assertTrue(classify([]).library)
        self.assertTrue(classify([], force_full=True).dependency)
        self.assertTrue(classify(["site/foo"], force_full=True).codeql)

    def test_scheduled_and_manual_runs_are_full(self):
        for event in ("schedule", "workflow_dispatch", "unexpected"):
            with self.subTest(event=event):
                paths, _, force = changed_paths(event, "")
                self.assertEqual(paths, [])
                self.assertTrue(force)

    def test_push_unknown_before_is_fail_closed(self):
        self.assertTrue(changed_paths("push", ZERO_SHA)[2])
        self.assertTrue(changed_paths("push", "not-a-sha")[2])

    def test_pull_request_diff_is_merge_against_first_parent(self):
        with patch("ci_scope.git") as g:
            g.side_effect = [
                b"a" * 40 + b"\n",
                b"site/src/main.jsx\0site/src/style.css\0",
            ]
            files, _, force = changed_paths("pull_request", "")
        self.assertFalse(force)
        self.assertEqual(files, ["site/src/main.jsx", "site/src/style.css"])
        self.assertEqual(g.call_args_list[0].args[:3],
                         ("rev-parse", "--verify", "HEAD^1"))
        self.assertEqual(g.call_args_list[1].args[:3],
                         ("diff", "--no-renames", "--name-only"))

    def test_push_uses_before_sha_not_just_first_parent(self):
        before = "b" * 40
        with patch("ci_scope.git") as g:
            g.side_effect = [b"", b"pom.xml\0"]
            files, _, force = changed_paths("push", before)
        self.assertFalse(force)
        self.assertEqual(files, ["pom.xml"])
        self.assertIn(before, g.call_args_list[1].args)

    def test_git_failures_never_produce_skip(self):
        with patch("ci_scope.git", side_effect=subprocess.CalledProcessError(1, "git")):
            paths, _, force = changed_paths("pull_request", "")
        self.assertTrue(force)
        self.assertEqual(paths, [])


if __name__ == "__main__":
    unittest.main()
