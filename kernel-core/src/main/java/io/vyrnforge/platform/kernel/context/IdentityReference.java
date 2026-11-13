package io.vyrnforge.platform.kernel.context;

import java.util.Objects;

/** Provider-neutral external identity provenance. Issuer + subject form the stable reference. */
public record IdentityReference(String issuer, String subject) {
    public IdentityReference {
        issuer = requireText(issuer, "issuer");
        subject = requireText(subject, "subject");
    }

    private static String requireText(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
