package io.vyrnforge.platform.kernel.health;

import java.util.Objects;
import java.util.function.Supplier;
import java.util.regex.Pattern;

public record HealthProbe(
        String name,
        ProbeType type,
        Supplier<ProbeResult> check) {

    private static final Pattern NAME = Pattern.compile("^[a-z][a-z0-9_.:-]*$");

    public HealthProbe {
        Objects.requireNonNull(name, "name");
        if (!NAME.matcher(name).matches()) {
            throw new IllegalArgumentException("name has invalid format");
        }
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(check, "check");
    }

    public static HealthProbe liveness(String name, Supplier<ProbeResult> check) {
        return new HealthProbe(name, ProbeType.LIVENESS, check);
    }

    public static HealthProbe readiness(String name, Supplier<ProbeResult> check) {
        return new HealthProbe(name, ProbeType.READINESS, check);
    }
}
