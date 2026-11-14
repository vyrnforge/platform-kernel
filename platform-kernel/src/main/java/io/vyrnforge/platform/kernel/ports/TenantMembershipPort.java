package io.vyrnforge.platform.kernel.ports;

import java.util.UUID;

@FunctionalInterface
public interface TenantMembershipPort {
    boolean isMember(String actorId, UUID tenantId);
}
