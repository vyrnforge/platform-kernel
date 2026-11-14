package io.vyrnforge.platform.kernel.audit;

import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.context.ResourceReference;
import io.vyrnforge.platform.kernel.ids.UuidV7;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Accountability/governance evidence contract.
 * Audit is distinct from application logs and user-facing activity history.
 */
public record AuditEvent(
        UUID auditId,
        Instant occurredAt,
        UUID tenantId,
        ActorReference actor,
        String action,
        ResourceReference resource,
        AuditOutcome outcome,
        String source,
        UUID correlationId,
        String reason,
        Map<String, Object> changes) {

    private static final Pattern NAMESPACED_KEY =
            Pattern.compile("^[a-z][a-z0-9_.:-]*$");

    public AuditEvent {
        requireUuidV7(auditId, "auditId");
        Objects.requireNonNull(occurredAt, "occurredAt");
        if (tenantId != null) {
            requireUuidV7(tenantId, "tenantId");
        }
        action = requireMatch(action, "action");
        Objects.requireNonNull(resource, "resource");
        Objects.requireNonNull(outcome, "outcome");
        source = requireMatch(source, "source");
        requireUuidV7(correlationId, "correlationId");

        if (reason != null && reason.isBlank()) {
            reason = null;
        }
        changes = changes == null
                ? null
                : Collections.unmodifiableMap(new LinkedHashMap<>(changes));
    }

    private static void requireUuidV7(UUID value, String name) {
        Objects.requireNonNull(value, name);
        if (!UuidV7.isCanonical(value.toString())) {
            throw new IllegalArgumentException(name + " must be UUIDv7");
        }
    }

    private static String requireMatch(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank() || !NAMESPACED_KEY.matcher(value).matches()) {
            throw new IllegalArgumentException(name + " has invalid format");
        }
        return value;
    }
}
