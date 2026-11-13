package io.vyrnforge.platform.kernel.ports;

import io.vyrnforge.platform.kernel.context.ModuleEntitlement;

import java.util.UUID;

@FunctionalInterface
public interface ModuleEntitlementPort {
    ModuleEntitlement getEntitlement(UUID tenantId, String moduleKey);
}
