package io.vyrnforge.platform.kernel.context;

import java.util.Set;

/** Documented normalized IAM/IdP authorization projections; domain policy still belongs to the product. */
public record AuthorizationProjection(Set<String> groups, Set<String> roles, Set<String> permissions) {
    public AuthorizationProjection {
        groups = immutable(groups);
        roles = immutable(roles);
        permissions = immutable(permissions);
    }

    public static AuthorizationProjection empty() {
        return new AuthorizationProjection(Set.of(), Set.of(), Set.of());
    }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }

    private static Set<String> immutable(Set<String> values) {
        return values == null ? Set.of() : Set.copyOf(values);
    }
}
