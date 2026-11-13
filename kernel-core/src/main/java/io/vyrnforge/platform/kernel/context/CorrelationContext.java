package io.vyrnforge.platform.kernel.context;

import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.util.Objects;
import java.util.UUID;

/** requestId identifies one request; correlationId links work across the business flow. */
public record CorrelationContext(
        UUID requestId,
        UUID correlationId,
        UUID causationId,
        String traceparent,
        String tracestate) {

    public CorrelationContext {
        Objects.requireNonNull(requestId, "requestId");
        Objects.requireNonNull(correlationId, "correlationId");
    }

    public static CorrelationContext create() {
        return new CorrelationContext(UuidV7.generate(), UuidV7.generate(), null, null, null);
    }

    public static CorrelationContext create(UUID correlationId) {
        return new CorrelationContext(UuidV7.generate(), Objects.requireNonNull(correlationId, "correlationId"), null, null, null);
    }
}
