package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.ports.TenantMembershipPort;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

public final class InMemoryTenantMembershipPort implements TenantMembershipPort {
    private final Set<Membership> memberships = new HashSet<>();

    public InMemoryTenantMembershipPort add(String actorId, UUID tenantId) {
        memberships.add(new Membership(actorId, tenantId));
        return this;
    }

    @Override
    public boolean isMember(String actorId, UUID tenantId) {
        return memberships.contains(new Membership(actorId, tenantId));
    }

    private record Membership(String actorId, UUID tenantId) {
    }
}
