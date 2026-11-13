package io.vyrnforge.platform.kernel.context;

import java.time.Instant;
import java.util.Set;

/** Safe normalized authentication metadata. Raw provider claims are intentionally excluded. */
public record AuthenticationContext(Instant authenticatedAt, Set<String> methods) {
    public AuthenticationContext {
        methods = methods == null ? Set.of() : Set.copyOf(methods);
    }

    public static AuthenticationContext unspecified() {
        return new AuthenticationContext(null, Set.of());
    }
}
