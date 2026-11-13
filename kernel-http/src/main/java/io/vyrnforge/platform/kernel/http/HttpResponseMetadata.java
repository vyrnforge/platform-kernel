package io.vyrnforge.platform.kernel.http;

import io.vyrnforge.platform.kernel.context.CorrelationContext;

import java.util.Map;
import java.util.Objects;

/** Response metadata required for API traceability. */
public record HttpResponseMetadata(Map<String, String> headers) {
    public HttpResponseMetadata {
        headers = Map.copyOf(Objects.requireNonNull(headers, "headers"));
    }

    public static HttpResponseMetadata from(
            CorrelationContext correlation,
            HttpHeaderConfiguration configuration) {
        Objects.requireNonNull(correlation, "correlation");
        Objects.requireNonNull(configuration, "configuration");

        return new HttpResponseMetadata(Map.of(
                configuration.requestIdResponseHeader(), correlation.requestId().toString(),
                configuration.correlationIdResponseHeader(), correlation.correlationId().toString()));
    }
}
