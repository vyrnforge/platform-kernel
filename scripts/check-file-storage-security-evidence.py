#!/usr/bin/env python3
"""CAPAUD-03: require named File Storage security tests to EXECUTE and PASS.

This is *source-pinned CI* evidence, not deployed IAM/File Storage acceptance.
Use immediately after the current File Storage checkout's 'make ci' (clean verify).
The selected JUnit methods belong to File Storage and are intentionally not
reimplemented as Kernel unit tests.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

# Exact classes/methods inspected at current File Storage source
# a1903778af1e272ae15c025fe28c4cca369c09af.
# Do not silently drop checks when updating the frozen consumer source.
REQUIRED: dict[tuple[str, str], tuple[str, ...]] = {
    ("file-storage-security", "io.vyrnforge.filestorage.security.WyrmgateJwtVerifierTest"): (
        "j02_signatureAndHeaderConfusion",
        "j04_keyTrustAndFreshness",
        "j05_rotationOverlapThenRemoval",
        "j06_realTokenThroughKernelAndApplication",
        "keySourceOutageAndRecoveryNeverReuseRemovedKeyOrMutateOnDenial",
    ),
    ("file-storage-security", "io.vyrnforge.filestorage.security.SecuredFilesTest"): (
        "i05_sameTenantAndCrossAppNeedGrants",
        "i06_expiredRevokedAndReplay",
        "i07_authorityFailureIsNeutral",
    ),
    ("file-storage-persistence", "io.vyrnforge.filestorage.persistence.JdbcTransactionsTest"): (
        "p04_tenantQueriesAndForeignKeys",
        "replayReauthorizesAndNeverRecreatesMissingAggregate",
        "revokedGrantDeniesReplayWithoutRecreatingAggregate",
        "grantReadsObserveCommittedRevocationOutsideMetadataSnapshot",
        "kernelOutboxRetriesAndDeadLettersAreBounded",
        "kernelOutboxCrashAfterDeliveryRecoversWithSameEventId",
    ),
    ("file-storage-runtime", "io.vyrnforge.filestorage.runtime.RuntimeContractTest"): (
        "isolatedRoutesDenyInvalidIdentityTenantAndInputWithoutWrites",
        "transportErrorsAreNeutralAndConsistent",
    ),
    ("file-storage-runtime", "io.vyrnforge.filestorage.runtime.PolicyAdminHttpTest"): (
        "authenticationMembershipEntitlementAndActionChecksFailClosed",
    ),
    ("file-storage-runtime", "io.vyrnforge.filestorage.runtime.DurableUploadAuthorityTest"): (
        "currentGrantRevocationAndExpiryDenyWithoutConsumption",
        "auditedManifestProfileBoundedCaptureRevocationAndRestore",
        "quarantinedRestoreUsesSeparateOwnerAndExplicitDispatcherRestart",
    ),
}


def verify(backend: Path) -> dict[str, object]:
    if not backend.is_dir():
        raise ValueError("File Storage backend directory is absent")

    total = 0
    classes = []
    for (module, classname), required_methods in REQUIRED.items():
        path = backend / module / "target" / "surefire-reports" / f"TEST-{classname}.xml"
        if not path.is_file():
            raise ValueError(f"required JUnit report missing: {module}/{classname}")
        try:
            root = ET.parse(path).getroot()
        except ET.ParseError as exc:
            raise ValueError(f"invalid JUnit XML: {module}/{classname}") from exc

        if root.tag != "testsuite":
            raise ValueError(f"unexpected report root: {module}/{classname}")
        cases = [n for n in root.findall("testcase") if n.get("classname") == classname]
        for method in required_methods:
            matching = [n for n in cases if n.get("name") == method]
            if len(matching) != 1:
                raise ValueError(f"missing or repeated required test: {classname}.{method}")
            case = matching[0]
            if any(case.find(marker) is not None for marker in ("failure", "error", "skipped")):
                raise ValueError(f"required test failed or skipped: {classname}.{method}")
            total += 1
        classes.append(classname)

    # Print only approved metadata, never test stdout/stderr, tokens or DB secrets.
    return {
        "evidence_level": "SOURCE_PINNED_TEST_REPORTS_ONLY",
        "required_tests_passed": total,
        "required_classes": classes,
        "disposition": "NOT_LIVE_PROVIDER_OR_INDEPENDENT_SECURITY_ACCEPTANCE",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backend", type=Path, help="File Storage backend directory after make ci")
    args = parser.parse_args()
    try:
        result = verify(args.backend)
    except (ValueError, OSError) as exc:
        print(f"CAPAUD03_CONSUMER_SECURITY_FAILURE={exc}", file=sys.stderr)
        raise SystemExit(1) from exc
    print("CAPAUD03_CONSUMER_SECURITY_EVIDENCE=" + json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
