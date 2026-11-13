package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.context.ModuleEntitlement;
import io.vyrnforge.platform.kernel.ports.ModuleEntitlementPort;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public final class InMemoryModuleEntitlementPort implements ModuleEntitlementPort {
    private final Map<Key, ModuleEntitlement> entitlements = new HashMap<>();

    public InMemoryModuleEntitlementPort set(UUID tenantId, String moduleKey, boolean enabled) {
        entitlements.put(new Key(tenantId, moduleKey), new ModuleEntitlement(tenantId, moduleKey, enabled, Instant.EPOCH));
        return this;
    }

    @Override
    public ModuleEntitlement getEntitlement(UUID tenantId, String moduleKey) {
        return entitlements.get(new Key(tenantId, moduleKey));
    }

    private record Key(UUID tenantId, String moduleKey) {
    }
}
