package io.vyrnforge.platform.kernel.health;

import java.util.Objects;
import java.util.regex.Pattern;

/**
 * Safe health result. Only a machine-readable code is exposed; exception messages/details are not.
 */
public record ProbeResult(ProbeStatus status, String code) {
    private static final Pattern CODE = Pattern.compile("^[A-Z][A-Z0-9_.:-]*$");

    public ProbeResult {
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(code, "code");
        if (!CODE.matcher(code).matches()) {
            throw new IllegalArgumentException("code has invalid format");
        }
    }

    public static ProbeResult up() {
        return new ProbeResult(ProbeStatus.UP, "OK");
    }

    public static ProbeResult down(String code) {
        return new ProbeResult(ProbeStatus.DOWN, code);
    }
}
