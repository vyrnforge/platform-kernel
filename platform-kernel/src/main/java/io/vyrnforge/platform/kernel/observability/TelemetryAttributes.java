package io.vyrnforge.platform.kernel.observability;

import io.vyrnforge.platform.kernel.audit.AuditEvent;
import io.vyrnforge.platform.kernel.context.ActorReference;
import io.vyrnforge.platform.kernel.event.EventEnvelope;
import io.vyrnforge.platform.kernel.pipeline.ResolvedRequestContext;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Standard structured telemetry attributes. Timestamp/level belong to the chosen logger/telemetry SDK.
 * Arbitrary payload fields are deliberately not copied into telemetry.
 */
public final class TelemetryAttributes {
    private TelemetryAttributes() {
    }

    public static Map<String, String> forRequest(
            String service,
            String environment,
            String operation,
            String outcome,
            ResolvedRequestContext context,
            TelemetryAttributePolicy policy) {
        Objects.requireNonNull(context, "context");
        Objects.requireNonNull(policy, "policy");

        LinkedHashMap<String, String> attributes = base(service, environment, operation, outcome);
        attributes.put("request_id", context.correlation().requestId().toString());
        attributes.put("correlation_id", context.correlation().correlationId().toString());

        if (policy.includeTenantId()
                && context.actorContext().tenant().isTenantScoped()) {
            attributes.put("tenant_id", context.actorContext().tenant().tenantId().toString());
        }
        if (policy.includeActorId()) {
            attributes.put("actor_id", context.actorContext().actor().actorId());
        }

        return Map.copyOf(attributes);
    }

    public static Map<String, String> forEvent(
            String service,
            String environment,
            String operation,
            String outcome,
            EventEnvelope<?> event,
            TelemetryAttributePolicy policy) {
        Objects.requireNonNull(event, "event");
        Objects.requireNonNull(policy, "policy");

        LinkedHashMap<String, String> attributes = base(service, environment, operation, outcome);
        attributes.put("event_id", event.eventId().toString());
        attributes.put("event_type", event.eventType());
        attributes.put("correlation_id", event.correlationId().toString());
        putUuid(attributes, "causation_id", event.causationId());

        if (policy.includeTenantId()) {
            putUuid(attributes, "tenant_id", event.tenantId());
        }
        if (policy.includeActorId()) {
            putActor(attributes, event.actor());
        }

        return Map.copyOf(attributes);
    }

    public static Map<String, String> forAudit(
            String service,
            String environment,
            String operation,
            String outcome,
            AuditEvent audit,
            TelemetryAttributePolicy policy) {
        Objects.requireNonNull(audit, "audit");
        Objects.requireNonNull(policy, "policy");

        LinkedHashMap<String, String> attributes = base(service, environment, operation, outcome);
        attributes.put("audit_id", audit.auditId().toString());
        attributes.put("correlation_id", audit.correlationId().toString());

        if (policy.includeTenantId()) {
            putUuid(attributes, "tenant_id", audit.tenantId());
        }
        if (policy.includeActorId()) {
            putActor(attributes, audit.actor());
        }

        return Map.copyOf(attributes);
    }

    private static LinkedHashMap<String, String> base(
            String service,
            String environment,
            String operation,
            String outcome) {
        LinkedHashMap<String, String> attributes = new LinkedHashMap<>();
        attributes.put("service", requireText(service, "service"));
        attributes.put("environment", requireText(environment, "environment"));
        attributes.put("operation", requireText(operation, "operation"));
        attributes.put("outcome", requireText(outcome, "outcome"));
        return attributes;
    }

    private static void putUuid(Map<String, String> attributes, String key, UUID value) {
        if (value != null) {
            attributes.put(key, value.toString());
        }
    }

    private static void putActor(Map<String, String> attributes, ActorReference actor) {
        if (actor != null) {
            attributes.put("actor_id", actor.actorId());
        }
    }

    private static String requireText(String value, String name) {
        Objects.requireNonNull(value, name);
        if (value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
        return value;
    }
}
