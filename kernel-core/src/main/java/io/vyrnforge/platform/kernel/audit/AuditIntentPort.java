package io.vyrnforge.platform.kernel.audit;

/**
 * Reliability boundary for required audit evidence intent.
 *
 * A successful return means the implementation accepted responsibility for retaining/forwarding
 * the audit evidence under its documented durability guarantees. Storage technology and service
 * topology are intentionally not part of this interface.
 *
 * Required audit evidence must be composed with the associated operation so it cannot disappear
 * silently after the operation is acknowledged as successful.
 */
@FunctionalInterface
public interface AuditIntentPort {
    void accept(AuditEvent auditEvent);
}
