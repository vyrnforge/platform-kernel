#!/usr/bin/env python3
"""Stage exactly the published Maven coordinates, with no test module or secrets."""
import pathlib, shutil, sys, xml.etree.ElementTree as ET
root = pathlib.Path(__file__).resolve().parents[1]
version = (root / "VERSION").read_text().strip()
ns = {"m":"http://maven.apache.org/POM/4.0.0"}
group = "io.github.vyrnforge"
modules = {"platform-kernel-parent":".", "platform-kernel":"platform-kernel",
           "platform-kernel-jdbc":"kernel-persistence-jdbc", "platform-kernel-testkit":"kernel-testkit"}
out = pathlib.Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=False)
for artifact,module in modules.items():
    pom = root/module/"pom.xml"
    p = ET.parse(pom).getroot()
    assert p.findtext("m:artifactId", namespaces=ns)==artifact
    assert (p.findtext("m:groupId", namespaces=ns) or p.findtext("m:parent/m:groupId", namespaces=ns)) == group
    assert (p.findtext("m:version", namespaces=ns) or p.findtext("m:parent/m:version", namespaces=ns)) == version
    d = out/pathlib.Path(*group.split("."))/artifact/version
    d.mkdir(parents=True)
    shutil.copyfile(pom,d/f"{artifact}-{version}.pom")
    if module != ".":
        for suffix in (".jar","-sources.jar","-javadoc.jar"):
            n=f"{artifact}-{version}{suffix}"
            shutil.copyfile(root/module/"target"/n,d/n)
assert len(list(out.rglob("*.pom")))==4
assert len(list(out.rglob("*.jar")))==9
print("Staged 4 POMs and 9 JARs (3 libraries, 6 documentation archives).")
