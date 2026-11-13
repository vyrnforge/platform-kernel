package io.vyrnforge.platform.kernel.health;

import java.time.Clock;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Framework-neutral liveness/readiness aggregation.
 * Exceptions are converted to a safe DOWN code without exposing exception details.
 */
public final class HealthAggregator {
    private final Clock clock;
    private final List<HealthProbe> probes;

    public HealthAggregator(Clock clock, List<HealthProbe> probes) {
        this.clock = Objects.requireNonNull(clock, "clock");
        this.probes = List.copyOf(Objects.requireNonNull(probes, "probes"));
        ensureUniqueNamesPerType(this.probes);
    }

    public HealthSnapshot check(ProbeType type) {
        Objects.requireNonNull(type, "type");

        LinkedHashMap<String, ProbeResult> results = new LinkedHashMap<>();
        ProbeStatus overall = ProbeStatus.UP;

        for (HealthProbe probe : probes) {
            if (probe.type() != type) {
                continue;
            }

            ProbeResult result;
            try {
                result = probe.check().get();
                if (result == null) {
                    result = ProbeResult.down("PROBE_NULL");
                }
            } catch (RuntimeException failure) {
                result = ProbeResult.down("PROBE_EXCEPTION");
            }

            results.put(probe.name(), result);
            if (result.status() == ProbeStatus.DOWN) {
                overall = ProbeStatus.DOWN;
            }
        }

        return new HealthSnapshot(type, overall, clock.instant(), results);
    }

    private static void ensureUniqueNamesPerType(List<HealthProbe> probes) {
        Map<ProbeType, java.util.Set<String>> seen = new java.util.EnumMap<>(ProbeType.class);
        for (HealthProbe probe : probes) {
            java.util.Set<String> names = seen.computeIfAbsent(
                    probe.type(), ignored -> new java.util.HashSet<>());
            if (!names.add(probe.name())) {
                throw new IllegalArgumentException(
                        "duplicate probe name for " + probe.type() + ": " + probe.name());
            }
        }
    }
}
