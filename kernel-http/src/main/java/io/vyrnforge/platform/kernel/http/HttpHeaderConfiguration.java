package io.vyrnforge.platform.kernel.http;

import java.util.Objects;

/**
 * Configurable HTTP header names for the V1 edge adapter.
 * Defaults are implementation choices, not permanent platform contracts.
 */
public record HttpHeaderConfiguration(
        String authorizationHeader,
        String tenantIdHeader,
        String correlationIdHeader,
        String requestIdResponseHeader,
        String correlationIdResponseHeader,
        String traceparentHeader,
        String tracestateHeader) {

    public HttpHeaderConfiguration {
        authorizationHeader = requireHeader(authorizationHeader, "authorizationHeader");
        tenantIdHeader = requireHeader(tenantIdHeader, "tenantIdHeader");
        correlationIdHeader = requireHeader(correlationIdHeader, "correlationIdHeader");
        requestIdResponseHeader = requireHeader(requestIdResponseHeader, "requestIdResponseHeader");
        correlationIdResponseHeader = requireHeader(correlationIdResponseHeader, "correlationIdResponseHeader");
        traceparentHeader = requireHeader(traceparentHeader, "traceparentHeader");
        tracestateHeader = requireHeader(tracestateHeader, "tracestateHeader");
    }

    public static HttpHeaderConfiguration v1Defaults() {
        return new HttpHeaderConfiguration(
                "Authorization",
                "X-Tenant-Id",
                "X-Correlation-Id",
                "X-Request-Id",
                "X-Correlation-Id",
                "traceparent",
                "tracestate");
    }

    private static String requireHeader(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        if (value.indexOf('\r') >= 0 || value.indexOf('\n') >= 0) {
            throw new IllegalArgumentException(name + " must not contain CR/LF");
        }
        return value;
    }
}
