package io.vyrnforge.platform.kernel.event;

import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Transport-neutral event envelope aligned with the Phase 0 EventEnvelope contract.
 * Payload type is deliberately domain-owned.
 */
public record EventEnvelope<T>(
        UUID eventId,
        String eventType,
        int eventVersion,
        Instant occurredAt,
        UUID tenantId,
        String producer,
        String subjectType,
        String subjectId,
        UUID correlationId,
        UUID causationId,
        ActorReference actor,
        T payload) {

    private static final Pattern EVENT_TYPE =
            Pattern.compile("^[a-z][a-z0-9_-]*(\\.[a-z][a-z0-9_-]*){1,}$");
    private static final Pattern NAMESPACED_KEY =
            Pattern.compile("^[a-z][a-z0-9_.:-]*$");

    public EventEnvelope {
        requireUuidV7(eventId, "eventId");
        eventType = requireMatch(eventType, "eventType", EVENT_TYPE, 192);
        if (eventVersion < 1) {
            throw new IllegalArgumentException("eventVersion must be positive");
        }
        Objects.requireNonNull(occurredAt, "occurredAt");
        if (tenantId != null) {
            requireUuidV7(tenantId, "tenantId");
        }
        producer = requireMatch(producer, "producer", NAMESPACED_KEY, 128);
        subjectType = requireMatch(subjectType, "subjectType", NAMESPACED_KEY, 128);
        subjectId = requireText(subjectId, "subjectId", 512);
        requireUuidV7(correlationId, "correlationId");
        if (causationId != null) {
            requireUuidV7(causationId, "causationId");
        }
        Objects.requireNonNull(payload, "payload");
        // DTOs remain supported; transport adapters must validate serialized JSON shape.
        if (payload instanceof CharSequence || payload instanceof Number || payload instanceof Boolean
                || payload instanceof Character || payload instanceof Iterable<?> || payload instanceof Enum<?>
                || payload.getClass().isArray()) {
            throw new IllegalArgumentException("event payload must represent a JSON object");
        }
    }

    private static void requireUuidV7(UUID value, String name) {
        Objects.requireNonNull(value, name);
        if (!UuidV7.isCanonical(value.toString())) {
            throw new IllegalArgumentException(name + " must be UUIDv7");
        }
    }

    private static String requireMatch(String value, String name, Pattern pattern, int maxLength) {
        value = requireText(value, name, maxLength);
        if (!pattern.matcher(value).matches()) {
            throw new IllegalArgumentException(name + " has invalid format");
        }
        return value;
    }

    private static String requireText(String value, String name, int maxLength) {
        Objects.requireNonNull(value, name);
        if (value.isBlank() || value.codePointCount(0, value.length()) > maxLength) {
            throw new IllegalArgumentException(name + " must not be blank or exceed " + maxLength + " characters");
        }
        return value;
    }
}
