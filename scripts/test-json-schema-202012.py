#!/usr/bin/env python3
"""Executable *wire-shape* vectors for the released Phase 0 v0.2 JSON Schemas.

Uses jsonschema Draft202012Validator with a strictly local registry. No network
schema resolution, no product claims, no actor authorization, no new wire fields.
The format-assertion mode is explicit and intentionally tested separately.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / "platform-kernel/src/main/resources/contracts/phase0/v0.2"
V7_A = "019a7f0e-2234-7abc-8def-1234567890ab"
V7_B = "019a7f0e-6234-7abc-8def-1234567890ab"
V7_C = "019a7f0e-4234-7abc-8def-1234567890ab"
UTC = "2026-11-13T07:30:00Z"
CHECKS = 0


def expect(validator: Draft202012Validator, value: object, valid: bool, case: str) -> None:
    global CHECKS
    errors = list(validator.iter_errors(value))
    if (len(errors) == 0) != valid:
        details = "; ".join(f"{list(e.absolute_path)}: {e.message}" for e in errors[:3])
        raise AssertionError(f"{case}: expected valid={valid}; errors={details or 'none'}")
    CHECKS += 1


def fixtures() -> dict[str, dict]:
    actor = {"actor_type": "service", "actor_id": "opaque-service"}
    tenant = {"scope": "tenant", "tenant_id": V7_A}
    resource = {"resource_type": "platform.record", "resource_id": "opaque-42",
                "tenant_id": V7_A}
    return {
        "IdentityReference": {"issuer": "https://issuer.example", "subject": "opaque-123"},
        "ActorReference": actor,
        "TenantContext": tenant,
        "ActorContext": {"actor": actor, "tenant": tenant},
        "ResourceReference": resource,
        "CorrelationContext": {"request_id": V7_B, "correlation_id": V7_C},
        "ApiError": {"code": "VALIDATION_FAILED", "message": "Invalid request.",
                     "request_id": V7_B, "correlation_id": V7_C},
        "EventEnvelope": {
            "event_id": V7_B, "event_type": "platform.record.created", "event_version": 1,
            "occurred_at": UTC, "tenant_id": V7_A, "producer": "platform",
            "subject_type": "platform.record", "subject_id": "opaque-42",
            "correlation_id": V7_C, "causation_id": None, "actor": None, "payload": {}
        },
        "AuditEvent": {
            "audit_id": V7_B, "occurred_at": UTC, "tenant_id": V7_A,
            "actor": None, "action": "platform.record.created", "resource": resource,
            "outcome": "success", "source": "platform", "correlation_id": V7_C
        },
        "FileReference": {"file_id": "opaque-file-42", "owner_tenant_id": V7_A,
                          "storage_service": "file-storage"},
        "ModuleEntitlement": {"tenant_id": V7_A, "module_key": "platform",
                              "enabled": True},
    }


def main() -> None:
    manifest = json.loads((SCHEMAS / "contract-manifest.json").read_text(encoding="utf-8"))
    assert manifest["schema_dialect"] == "https://json-schema.org/draft/2020-12/schema"
    assert manifest["version"] == "0.2.0" and manifest["status"] == "released"

    entries = manifest["contracts"]
    assert len(entries) == 11
    schemas = {item["name"]: json.loads((SCHEMAS / item["file"]).read_text(encoding="utf-8"))
               for item in entries}
    assert set(schemas) == set(fixtures()), "manifest and fixture coverage must match"
    registry = Registry()
    for value in schemas.values():
        Draft202012Validator.check_schema(value)
        registry = registry.with_resource(value["$id"], Resource.from_contents(value))
    # Registry with no retrieval hook refuses any network lookup for an unknown $ref.
    validators = {name: Draft202012Validator(value, registry=registry)
                  for name, value in schemas.items()}
    strict = {name: Draft202012Validator(value, registry=registry,
                                        format_checker=FormatChecker())
              for name, value in schemas.items()}
    samples = fixtures()

    for name, value in samples.items():
        validator = validators[name]
        expect(validator, value, True, name + ": minimal valid shape")
        # Required is independent from nullability: remove every required property.
        for field in schemas[name]["required"]:
            modified = copy.deepcopy(value)
            del modified[field]
            expect(validator, modified, False, name + ": missing required " + field)
        modified = {**value, "future_optional_field": {"ignored": True}}
        expect(validator, modified, True, name + ": compatible unknown optional field")

    examples = json.loads((SCHEMAS / "examples.json").read_text(encoding="utf-8"))
    for name, value in examples.items():
        target = "ActorContext" if name == "TenantlessActorContext" else name
        expect(validators[target], value, True, name + ": original v0.2 positive example")

    tenant = samples["TenantContext"]
    expect(validators["TenantContext"], {"scope": "none", "tenant_id": None}, True, "tenantless explicit")
    expect(validators["TenantContext"], {"scope": "tenant", "tenant_id": None}, False, "tenant requires ID")
    expect(validators["TenantContext"], {"scope": "none", "tenant_id": V7_A}, False, "tenantless forbids ID")
    expect(validators["TenantContext"], {"scope": "deployment", "tenant_id": None}, False, "deployment is not tenantless")

    actor = copy.deepcopy(samples["ActorReference"])
    actor["actor_type"] = "unknown"
    expect(validators["ActorReference"], actor, False, "actor enum expansion is breaking")
    actor["actor_type"] = "user"
    actor["actor_id"] = ""
    expect(validators["ActorReference"], actor, False, "blank actor ID")
    event = copy.deepcopy(samples["EventEnvelope"])
    event["event_version"] = 0
    expect(validators["EventEnvelope"], event, False, "event version minimum")
    event["event_version"] = 1
    event["tenant_id"] = None
    expect(validators["EventEnvelope"], event, True, "null event tenant is structurally valid, NOT privileged")
    event["actor"] = None
    event["causation_id"] = None
    expect(validators["EventEnvelope"], event, True, "nullable fields present")
    event["payload"] = ["not", "an", "object"]
    expect(validators["EventEnvelope"], event, False, "event payload object only")

    correlation = copy.deepcopy(samples["CorrelationContext"])
    correlation["request_id"] = "550e8400-e29b-41d4-a716-446655440000"
    expect(validators["CorrelationContext"], correlation, False, "v4 UUID rejected")
    correlation["request_id"] = V7_B.upper()
    expect(validators["CorrelationContext"], correlation, False, "uppercase UUID rejected")

    ref = copy.deepcopy(samples["FileReference"])
    ref["file_id"] = "non-uuid/opaque:42"
    expect(validators["FileReference"], ref, True, "external file identifier stays opaque")
    ref["size"] = -1
    expect(validators["FileReference"], ref, False, "negative byte size")
    ref["size"] = 2**53 + 3
    expect(validators["FileReference"], ref, True, "schema has no JavaScript safe-integer bound")

    # JSON Schema 2020-12 default format vocabulary is annotation-only.
    # With explicit FormatChecker and rfc3339-validator installed, bad dates reject.
    event = copy.deepcopy(samples["EventEnvelope"])
    event["occurred_at"] = "not-a-real-dateZ"
    expect(validators["EventEnvelope"], event, True, "date-time annotation mode")
    expect(strict["EventEnvelope"], event, False, "date-time assertion mode")
    event["occurred_at"] = "2026-11-13T14:30:00+07:00"
    expect(validators["EventEnvelope"], event, False, "UTC Z suffix required by released pattern")
    event["occurred_at"] = UTC
    expect(strict["EventEnvelope"], event, True, "valid RFC3339 UTC instant")

    print(f"JSON Schema draft 2020-12 validation: {len(schemas)} schemas, {CHECKS} shape cases PASS")
    print("Mode: local-only registry; date-time annotation and optional assertion compared")
    print("NOT an authentication, authorization, cross-language, or consumer acceptance check")


if __name__ == "__main__":
    main()
