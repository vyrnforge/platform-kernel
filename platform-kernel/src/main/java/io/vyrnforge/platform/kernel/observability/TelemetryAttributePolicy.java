package io.vyrnforge.platform.kernel.observability;

/**
 * Explicit privacy policy for potentially identifying telemetry dimensions.
 * Secure defaults exclude tenant and actor identifiers.
 */
public record TelemetryAttributePolicy(boolean includeTenantId, boolean includeActorId) {
    public static TelemetryAttributePolicy safeDefaults() {
        return new TelemetryAttributePolicy(false, false);
    }

    public static TelemetryAttributePolicy tenantOnly() {
        return new TelemetryAttributePolicy(true, false);
    }

    public static TelemetryAttributePolicy tenantAndActor() {
        return new TelemetryAttributePolicy(true, true);
    }
}
