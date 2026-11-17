#!/usr/bin/env python3
"""Guard selected released v0.2 schema *declarations*, without changing them.

This uses only Python's standard library and intentionally is NOT a JSON Schema
validator. The existing compatibility check protects immutable v0.1 and the
v0.2 transformation. The JVM test suites cover selected runtime behaviors.
See docs/research/portable-behavior-vectors-spec.md (PV identifiers).
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "platform-kernel/src/main/resources/contracts/phase0/v0.2"


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def schema(filename):
    return json.loads((CONTRACTS / filename).read_text(encoding="utf-8"))


def required_fields(doc, *names):
    require(set(names).issubset(doc["required"]),
            f"{doc['title']}: missing required fields {set(names) - set(doc['required'])}")


def is_nullable(doc, field):
    value = doc["properties"][field]
    return any(option.get("type") == "null" for option in value.get("anyOf", [])) or (
        isinstance(value.get("type"), list) and "null" in value["type"]
    )


def main():
    manifest = schema("contract-manifest.json")
    require(manifest["version"] == "0.2.0", "released wire version changed")
    require(manifest["status"] == "released", "wire status changed")
    require(manifest["schema_dialect"] == "https://json-schema.org/draft/2020-12/schema",
            "unexpected schema dialect")
    entries = manifest["contracts"]
    require(len(entries) == 11, "expected eleven released contracts")
    names = [entry["name"] for entry in entries]
    files = [entry["file"] for entry in entries]
    require(len(set(names)) == len(names) and len(set(files)) == len(files),
            "duplicate contract manifest names/files")
    require(set(files) == {p.name for p in CONTRACTS.glob("*.schema.json")},
            "manifest/schema file set drifted")

    for name in files:
        item = schema(name)
        require(item["$schema"] == manifest["schema_dialect"], f"{name}: dialect changed")
        require(item["$id"].endswith("/phase0/v0.2/" + name), f"{name}: id/version changed")

    tenant = schema("tenant-context.schema.json")
    required_fields(tenant, "scope", "tenant_id")
    require(tenant["properties"]["scope"]["enum"] == ["tenant", "none"],
            "tenant scope changed")
    require(is_nullable(tenant, "tenant_id"), "tenant ID nullability changed")
    restrictions = tenant["allOf"]
    require(any(branch.get("if", {}).get("properties", {}).get("scope", {}).get("const") == "tenant"
                and branch.get("then", {}).get("properties", {}).get("tenant_id", {}).get("type") == "string"
                for branch in restrictions), "tenant scope must require string tenant ID")
    require(any(branch.get("if", {}).get("properties", {}).get("scope", {}).get("const") == "none"
                and branch.get("then", {}).get("properties", {}).get("tenant_id", {}).get("type") == "null"
                for branch in restrictions), "tenantless scope must require null tenant ID")

    event = schema("event-envelope.schema.json")
    required_fields(event, "event_id", "event_type", "event_version", "occurred_at",
                    "tenant_id", "producer", "subject_type", "subject_id",
                    "correlation_id", "causation_id", "actor", "payload")
    require(all(is_nullable(event, name) for name in ("tenant_id", "causation_id", "actor")),
            "required-nullable event fields drifted")
    require(event["properties"]["subject_id"]["type"] == "string"
            and "format" not in event["properties"]["subject_id"],
            "opaque external subject ID narrowed")
    require(event["properties"]["event_version"]["minimum"] == 1,
            "event version lower bound drifted")

    error = schema("api-error.schema.json")
    required_fields(error, "code", "message", "request_id", "correlation_id")
    require(error["properties"]["details"]["type"] == ["object", "null"],
            "safe optional error details shape changed")

    file_ref = schema("file-reference.schema.json")
    required_fields(file_ref, "file_id", "owner_tenant_id", "storage_service")
    require("format" not in file_ref["properties"]["file_id"],
            "file identifiers must remain opaque")
    require(is_nullable(file_ref, "owner_tenant_id"),
            "global file reference nullability changed")

    correlation = schema("correlation-context.schema.json")
    required_fields(correlation, "request_id", "correlation_id")
    uuid_pattern = correlation["properties"]["request_id"]["pattern"]
    require(re.fullmatch(uuid_pattern, "019a7f0e-6234-7abc-8def-1234567890ab") is not None,
            "canonical UUIDv7 no longer accepted")
    for not_valid in ("550e8400-e29b-41d4-a716-446655440000",
                      "019A7F0E-6234-7ABC-8DEF-1234567890AB"):
        require(re.fullmatch(uuid_pattern, not_valid) is None,
                "noncanonical UUID accepted by released regex")

    example = schema("examples.json")
    require(set(example) == {"ActorContext", "TenantlessActorContext",
                             "EventEnvelope", "ApiError"},
            "released positive example set drifted")

    # 'format:date-time' is an annotation in the default 2020-12 vocabulary.
    # This deliberately tests the declaration only, not full RFC3339 semantics.
    for name in ("event-envelope.schema.json", "audit-event.schema.json"):
        timestamp = schema(name)["properties"]["occurred_at"]
        require(timestamp["format"] == "date-time" and timestamp["pattern"] == "Z$",
                f"{name}: UTC date declaration changed")
    print("Portable contract declaration invariants: 11 schemas, 4 examples OK")
    print("NOTE: not a JSON Schema validator or proof of trust/authorization")


if __name__ == "__main__":
    main()
