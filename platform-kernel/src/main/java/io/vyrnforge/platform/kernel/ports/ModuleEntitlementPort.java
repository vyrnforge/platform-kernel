package io.vyrnforge.platform.kernel.ports;

import io.vyrnforge.platform.kernel.context.ModuleEntitlement;

import java.util.UUID;

/**
 * Returns the current effective decision for the tenant and module, or null if unavailable.
 * The provider owns scheduling, expiry and revocation. enabled reflects the decision
 * at lookup time; effectiveAt describes when the decision became effective.
 */
@FunctionalInterface
public interface ModuleEntitlementPort {
    ModuleEntitlement getEntitlement(UUID tenantId, String moduleKey);
}
