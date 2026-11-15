#!/usr/bin/env bash
# Independent pinned consumer, isolated Maven cache; no publish or modification of File Storage.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
version="$(tr -d '[:space:]' < "$root/VERSION")"
consumer=2effe678943242260c64ef252bae7378aa61434a
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git init -q "$work/file-storage"
git -C "$work/file-storage" remote add origin https://github.com/vyrnforge/file-storage.git
git -C "$work/file-storage" fetch --depth=1 origin "$consumer"
git -C "$work/file-storage" checkout --detach FETCH_HEAD
test "$(git -C "$work/file-storage" rev-parse HEAD)" = "$consumer"
jar="$root/platform-kernel/target/platform-kernel-$version.jar"
test -s "$jar"
sha256sum "$jar"
mvn -B -ntp --strict-checksums -Dmaven.repo.local="$work/m2" org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file -Dfile="$root/pom.xml" -DpomFile="$root/pom.xml"
mvn -B -ntp --strict-checksums -Dmaven.repo.local="$work/m2" org.apache.maven.plugins:maven-install-plugin:3.1.4:install-file -Dfile="$jar" -DpomFile="$root/platform-kernel/pom.xml"
cd "$work/file-storage"
# Only temporary dependency wiring changes; exercise original consumer source and CI.
sed -i "s|<kernel.version>0.3.0</kernel.version>|<kernel.version>$version</kernel.version>|; s|io.vyrnforge.platform</groupId>|io.github.vyrnforge</groupId>|g" backend/pom.xml backend/file-storage-domain/pom.xml
sed -i 's|"io.vyrnforge.platform", "platform-kernel"|"io.github.vyrnforge", "platform-kernel"|' scripts/check-domain-boundaries.py
cat > scripts/bootstrap-kernel.sh <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
test -s "$KERNEL_CANDIDATE"
cmp "$KERNEL_CANDIDATE" "$KERNEL_INSTALLED"
echo "Using exact locally built kernel candidate; no remote release substitution."
EOF
export KERNEL_CANDIDATE="$jar"
export KERNEL_INSTALLED="$work/m2/io/github/vyrnforge/platform-kernel/$version/platform-kernel-$version.jar"
export MAVEN_OPTS="${MAVEN_OPTS:-} -Dmaven.repo.local=$work/m2"
make ci
echo "File Storage $consumer passed with kernel $version candidate."
