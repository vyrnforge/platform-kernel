package io.vyrnforge.platform.kernel.observability;

import io.vyrnforge.platform.kernel.context.CorrelationContext;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.util.Objects;
import java.util.UUID;

/**
 * Transport-neutral helpers for preserving business correlation across requests, events, and jobs.
 * Trace context is carried as opaque W3C metadata; this library does not select a tracing SDK.
 */
public final class CorrelationPropagation {
    private CorrelationPropagation() {
    }

    public static CorrelationContext root(String traceparent, String tracestate) {
        return new CorrelationContext(
                UuidV7.generate(),
                UuidV7.generate(),
                null,
                normalizeTrace(traceparent, 128, "traceparent"),
                normalizeTrace(tracestate, 512, "tracestate"));
    }

    public static CorrelationContext continueInbound(
            UUID correlationId,
            String traceparent,
            String tracestate) {
        Objects.requireNonNull(correlationId, "correlationId");
        if (!UuidV7.isCanonical(correlationId.toString())) {
            throw new IllegalArgumentException("correlationId must be UUIDv7");
        }

        return new CorrelationContext(
                UuidV7.generate(),
                correlationId,
                null,
                normalizeTrace(traceparent, 128, "traceparent"),
                normalizeTrace(tracestate, 512, "tracestate"));
    }

    public static CorrelationContext fromEvent(
            EventEnvelope<?> event,
            String traceparent,
            String tracestate) {
        Objects.requireNonNull(event, "event");

        return new CorrelationContext(
                UuidV7.generate(),
                event.correlationId(),
                event.eventId(),
                normalizeTrace(traceparent, 128, "traceparent"),
                normalizeTrace(tracestate, 512, "tracestate"));
    }

    public static CorrelationContext child(
            CorrelationContext parent,
            UUID causationId) {
        Objects.requireNonNull(parent, "parent");
        Objects.requireNonNull(causationId, "causationId");
        if (!UuidV7.isCanonical(causationId.toString())) {
            throw new IllegalArgumentException("causationId must be UUIDv7");
        }

        return new CorrelationContext(
                UuidV7.generate(),
                parent.correlationId(),
                causationId,
                parent.traceparent(),
                parent.tracestate());
    }

    private static String normalizeTrace(String value, int maxLength, String name) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (value.length() > maxLength || value.indexOf('\r') >= 0 || value.indexOf('\n') >= 0) {
            throw new IllegalArgumentException(name + " is invalid");
        }
        return value;
    }
}
