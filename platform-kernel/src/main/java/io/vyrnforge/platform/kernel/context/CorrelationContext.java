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
        if (!UuidV7.isCanonical(requestId.toString()) || !UuidV7.isCanonical(correlationId.toString())
                || (causationId != null && !UuidV7.isCanonical(causationId.toString()))) {
            throw new IllegalArgumentException("correlation identifiers must be UUIDv7");
        }
        if (traceparent != null && traceparent.codePointCount(0, traceparent.length()) > 128
                || tracestate != null && tracestate.codePointCount(0, tracestate.length()) > 512) {
            throw new IllegalArgumentException("trace metadata exceeds contract length");
        }
    }

    public static CorrelationContext create() {
        return new CorrelationContext(UuidV7.generate(), UuidV7.generate(), null, null, null);
    }

    public static CorrelationContext create(UUID correlationId) {
        return new CorrelationContext(UuidV7.generate(), Objects.requireNonNull(correlationId, "correlationId"), null, null, null);
    }
}
