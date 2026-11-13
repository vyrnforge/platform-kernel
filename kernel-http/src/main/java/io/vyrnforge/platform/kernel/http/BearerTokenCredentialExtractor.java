package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.errors.KernelAccessException;
import io.vyrnforge.platform.kernel.errors.KernelFailure;

import java.util.Objects;

/**
 * Extracts a Bearer credential without parsing, logging, or normalizing provider-specific token claims.
 */
public final class BearerTokenCredentialExtractor implements HttpCredentialExtractor<String> {
    private final HttpHeaderConfiguration headers;

    public BearerTokenCredentialExtractor(HttpHeaderConfiguration headers) {
        this.headers = Objects.requireNonNull(headers, "headers");
    }

    @Override
    public String extract(HttpRequestMetadata request) {
        Objects.requireNonNull(request, "request");

        final String authorization;
        try {
            authorization = request.singleOptional(headers.authorizationHeader());
        } catch (IllegalArgumentException invalid) {
            throw authenticationFailure();
        }

        if (authorization == null) {
            throw authenticationFailure();
        }

        int separator = authorization.indexOf(' ');
        if (separator <= 0 || !authorization.substring(0, separator).equalsIgnoreCase("Bearer")) {
            throw authenticationFailure();
        }

        String token = authorization.substring(separator + 1).trim();
        if (token.isEmpty() || token.chars().anyMatch(Character::isWhitespace)) {
            throw authenticationFailure();
        }

        return token;
    }

    private KernelAccessException authenticationFailure() {
        return new KernelAccessException(
                KernelFailure.AUTHENTICATION_FAILED,
                "Authentication could not be established.");
    }
}
