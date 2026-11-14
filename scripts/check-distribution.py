#!/usr/bin/env python3
"""Verify the three physical libraries and frozen v0.2.1 public implementation inventory."""
import hashlib, json, pathlib, subprocess, tempfile, zipfile, xml.etree.ElementTree as ET
root = pathlib.Path(__file__).resolve().parents[1]
version = (root / "VERSION").read_text().strip()
baseline = json.loads((root / "scripts/distribution-v021-baseline.json").read_text())
locations = {"platform-kernel": "platform-kernel", "platform-kernel-jdbc": "kernel-persistence-jdbc", "platform-kernel-testkit": "kernel-testkit"}
expected = {root / module / "target" / f"{artifact}-{version}.jar" for artifact, module in locations.items()}
actual = {p for p in root.glob("**/target/*.jar") if "node_modules" not in p.parts}
docs = {root / module / "target" / f"{artifact}-{version}-{kind}.jar" for artifact, module in locations.items() for kind in ("sources", "javadoc")}
if "--release-docs" in __import__("sys").argv:
    expected |= docs
    for p in docs:
        with zipfile.ZipFile(p) as z:
            assert any(n.endswith(".java" if "-sources.jar" in p.name else ".html") for n in z.namelist()), f"Empty documentation archive: {p}"
assert actual == expected, f"Unexpected JAR inventory: missing={expected-actual}, extra={actual-expected}"
seen = set()
for artifact, module in locations.items():
    jar = root / module / "target" / f"{artifact}-{version}.jar"
    with zipfile.ZipFile(jar) as z:
        names = z.namelist()
        assert len(names) == len(set(names)), f"Duplicate ZIP entry: {artifact}"
        classes = {n for n in names if n.endswith(".class")}
        required = set(baseline[artifact]["classes"])
        assert required <= classes, f"Missing classes: {required-classes}"
        assert all(c.startswith("io/vyrnforge/platform/kernel/") for c in classes), f"Third-party classes in {artifact}"
        assert not seen & classes, f"Duplicate classes across JARs: {seen&classes}"
        seen.update(classes)
        for name, sha in baseline[artifact]["resources"].items():
            data = z.read(name)
            actual_sha = hashlib.sha1(f"blob {len(data)}".encode()+bytes([0])+data).hexdigest()
            assert actual_sha == sha, f"Frozen resource changed: {name}"
        if artifact == "platform-kernel":
            assert not any("/testkit/" in c or "/persistence/jdbc/" in c for c in classes)
            assert not any(n.startswith("db/migration/") for n in names)
        elif artifact == "platform-kernel-jdbc":
            assert not any("/testkit/" in c for c in classes)
        print(f"{jar.name}: {len(classes)} classes, {len(baseline[artifact]['resources'])} preserved resources")
# Verify runtime dependencies are still thin. Parent only supplies JUnit test dependency management.
ns = {"m": "http://maven.apache.org/POM/4.0.0"}
for artifact, module in locations.items():
    pom = ET.parse(root / module / "pom.xml").getroot()
    deps = [(d.findtext("m:groupId", namespaces=ns), d.findtext("m:artifactId", namespaces=ns))
            for d in pom.findall("m:dependencies/m:dependency", ns)
            if d.findtext("m:scope", default="compile", namespaces=ns) != "test"]
    if artifact == "platform-kernel":
        assert not deps, f"Main JAR gained runtime dependencies: {deps}"
    else:
        assert ("io.github.vyrnforge", "platform-kernel") in deps
        assert all(g != "io.github.vyrnforge" or a == "platform-kernel" for g,a in deps)
with tempfile.TemporaryDirectory() as out:
    cp = ":".join(str(root / locations[a] / "target" / f"{a}-{version}.jar") for a in ("platform-kernel", "platform-kernel-testkit"))
    subprocess.run(["javac", "--release", "21", "-cp", cp, "-d", out, str(root / "verification/GoldenPathSmokeTest.java")], check=True)
    subprocess.run(["java", "-cp", out+":"+cp, "GoldenPathSmokeTest"], check=True)
print("Three physical JARs, preserved resources, dependency isolation and packaged consumer OK")
