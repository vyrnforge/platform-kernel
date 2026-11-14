package io.vyrnforge.platform.kernel.ids;

import java.security.SecureRandom;
import java.time.Clock;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

/** Utility for generating and validating canonical lowercase UUIDv7 identifiers. */
public final class UuidV7 {
    private static final long TIMESTAMP_MASK = 0x0000_FFFF_FFFF_FFFFL;
    private static final SecureRandom DEFAULT_RANDOM = new SecureRandom();

    private UuidV7() {
    }

    public static UUID generate() {
        return generate(Clock.systemUTC(), DEFAULT_RANDOM);
    }

    public static UUID generate(Clock clock, SecureRandom random) {
        Objects.requireNonNull(clock, "clock");
        Objects.requireNonNull(random, "random");

        long timestampMillis = clock.millis() & TIMESTAMP_MASK;
        long randA = random.nextLong() & 0x0FFFL;
        long randB = random.nextLong() & 0x3FFF_FFFF_FFFF_FFFFL;

        long mostSignificantBits = (timestampMillis << 16) | 0x7000L | randA;
        long leastSignificantBits = 0x8000_0000_0000_0000L | randB;
        return new UUID(mostSignificantBits, leastSignificantBits);
    }

    public static boolean isCanonical(String value) {
        if (value == null || !value.equals(value.toLowerCase(Locale.ROOT))) {
            return false;
        }
        try {
            UUID parsed = UUID.fromString(value);
            return parsed.version() == 7 && parsed.variant() == 2 && parsed.toString().equals(value);
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
}
