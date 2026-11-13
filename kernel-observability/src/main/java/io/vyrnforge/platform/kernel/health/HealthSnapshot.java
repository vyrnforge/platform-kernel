package io.vyrnforge.platform.kernel.health;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

public record HealthSnapshot(
        ProbeType type,
        ProbeStatus status,
        Instant checkedAt,
        Map<String, ProbeResult> components) {

    public HealthSnapshot {
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(checkedAt, "checkedAt");
        components = Map.copyOf(new LinkedHashMap<>(Objects.requireNonNull(components, "components")));
    }

    public boolean healthy() {
        return status == ProbeStatus.UP;
    }
}
