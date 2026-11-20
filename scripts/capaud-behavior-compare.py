#!/usr/bin/env python3
"""CAPAUD-01 permanent differential regression gate: released v0.3.2 vs candidate.

Compiles one Java 21 source against the actual pinned Maven Central core JAR,
then runs identical bytecode with released and development runtime JARs. This
proves specified observable constructor outcomes, not full product conformance.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
RELEASE_SHA = "88bd473f9e909d3031b5efce02e1b4189df1d731893190b9910767c3d97eef2e"
URL = "https://repo.maven.apache.org/maven2/io/github/vyrnforge/platform-kernel/0.3.2/platform-kernel-0.3.2.jar"

PROBE = r'''
import io.vyrnforge.platform.kernel.ids.UuidV7;
import io.vyrnforge.platform.kernel.module.ProductModule;
import io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;
import io.vyrnforge.platform.kernel.idempotency.IdempotencyRequest;
import java.time.Instant;
import java.util.UUID;

public final class CompatProbe {
  private static final UUID TENANT = UuidV7.generate();
  private static void probe(String id, Runnable operation) {
    try {
      operation.run();
      System.out.println(id + "=ACCEPT");
    } catch (IllegalArgumentException exception) {
      System.out.println(id + "=REJECT");
    }
  }
  private static void idem(String operation, String key, String fingerprint) {
    new IdempotencyRequest(TENANT, operation, key, fingerprint, Instant.parse("2030-01-01T00:00:00Z"));
  }
  public static void main(String[] args) {
    probe("module_dot", () -> new ProductModule("asset.catalog"));
    probe("module_underscore", () -> new ProductModule("asset_catalog"));
    probe("module_129", () -> new ProductModule("a".repeat(129)));
    probe("policy_valid", () -> EndpointPolicy.tenantModule("asset.catalog", "view"));
    probe("policy_upper", () -> EndpointPolicy.tenantModule("UPPER", "view"));
    probe("operation_192", () -> idem("a".repeat(192), "key", "fp"));
    probe("operation_193", () -> idem("a".repeat(193), "key", "fp"));
    probe("key_512", () -> idem("operation", "k".repeat(512), "fp"));
    probe("key_513", () -> idem("operation", "k".repeat(513), "fp"));
    probe("fingerprint_512", () -> idem("operation", "key", "f".repeat(512)));
    probe("fingerprint_513", () -> idem("operation", "key", "f".repeat(513)));
  }
}
'''

EXPECTED = {
  "module_dot": ("ACCEPT", "ACCEPT"),
  "module_underscore": ("REJECT", "ACCEPT"),
  "module_129": ("ACCEPT", "REJECT"),
  "policy_valid": ("ACCEPT", "ACCEPT"),
  "policy_upper": ("ACCEPT", "REJECT"),
  "operation_192": ("ACCEPT", "ACCEPT"),
  "operation_193": ("ACCEPT", "REJECT"),
  "key_512": ("ACCEPT", "ACCEPT"),
  "key_513": ("ACCEPT", "REJECT"),
  "fingerprint_512": ("ACCEPT", "ACCEPT"),
  "fingerprint_513": ("ACCEPT", "REJECT"),
}

def execute(jar: Path, directory: Path) -> dict[str,str]:
  response = subprocess.run(["java","-cp",str(directory)+":"+str(jar),"CompatProbe"],
                            check=True,capture_output=True,text=True,timeout=30)
  rows = [row.strip().split("=",1) for row in response.stdout.splitlines() if row.strip()]
  observed = dict(rows)
  if len(observed) != len(EXPECTED) or set(observed) != set(EXPECTED):
    raise AssertionError(f"unexpected Java results (case names only): {sorted(observed)}")
  return observed

def require_expected_matrix(before: dict[str, str], after: dict[str, str]) -> list[dict[str, str]]:
  """Reject all unreviewed drift while retaining the six *unapproved* known deltas."""
  if set(before) != set(EXPECTED) or set(after) != set(EXPECTED):
    raise AssertionError("unexpected comparison vector names")
  divergences = []
  for name, expected_pair in EXPECTED.items():
    observed = (before[name], after[name])
    if observed != expected_pair:
      raise AssertionError(f"unexpected behavior for {name}: {observed}")
    if observed[0] != observed[1]:
      divergences.append({"case": name, "released": observed[0], "candidate": observed[1]})
  return divergences


def main() -> None:
  candidate = ROOT/"platform-kernel/target/platform-kernel-0.3.2.jar"
  if not candidate.is_file():
    raise RuntimeError("expected candidate core jar missing after Maven verification")
  with tempfile.TemporaryDirectory(prefix="capaud-compat-") as temp:
    folder = Path(temp)
    released = folder/"published-platform-kernel.jar"
    with urllib.request.urlopen(URL, timeout=45) as response:
      if response.geturl() != URL or response.status != 200:
        raise RuntimeError("unexpected Maven Central response")
      binary = response.read(10_000_001)
    if len(binary)>10_000_000 or hashlib.sha256(binary).hexdigest()!=RELEASE_SHA:
      raise RuntimeError("immutable published v0.3.2 SHA mismatch")
    released.write_bytes(binary)
    probe_file = folder/"CompatProbe.java"
    probe_file.write_text(PROBE, encoding="utf-8")
    subprocess.run(["javac","--release","21","-cp",str(released),"-d",str(folder),str(probe_file)],
                   check=True,capture_output=True,text=True,timeout=60)
    before = execute(released,folder)
    after = execute(candidate,folder)
    divergences = require_expected_matrix(before, after)
    print("CAPAUD_BEHAVIOR "+json.dumps({
      "released_sha256":RELEASE_SHA,
      "candidate_sha256":hashlib.sha256(candidate.read_bytes()).hexdigest(),
      "cases_executed":len(EXPECTED),
      "observed_behavioral_differences":divergences,
      "known_differences_release_approved":False,
      "warning":"Known six differences are NOT approved for publication. This regression gate only rejects unreviewed drift in the 11 enumerated cases; not full consumer, persistence, IAM or release readiness",
    },sort_keys=True),flush=True)

if __name__ == "__main__":
  main()
