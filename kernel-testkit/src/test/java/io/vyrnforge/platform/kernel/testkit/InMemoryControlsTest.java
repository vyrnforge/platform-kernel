package io.vyrnforge.platform.kernel.testkit;

import io.vyrnforge.platform.kernel.config.ConfigurationKey;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.feature.FeatureFlagKey;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InMemoryControlsTest {
    private static final UUID TENANT_A =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");

    @Test
    void featureFlagsAreExactScopeAndDefaultDisabled() {
        FeatureFlagKey flag = new FeatureFlagKey("asset.bulk-import-v2");
        var flags = new InMemoryFeatureFlagPort()
                .set(flag, TenantContext.tenant(TENANT_A), true);

        assertTrue(flags.isEnabled(flag, TenantContext.tenant(TENANT_A)));
        assertFalse(flags.isEnabled(flag, TenantContext.tenant(TENANT_B)));
        assertFalse(flags.isEnabled(flag, TenantContext.none()));
    }

    @Test
    void configurationDoesNotImplicitlyFallBackAcrossScopes() {
        ConfigurationKey key = new ConfigurationKey("platform.locale.default");
        var configuration = new InMemoryConfigurationPort()
                .set(key, TenantContext.none(), "en-US")
                .set(key, TenantContext.tenant(TENANT_A), "id-ID");

        assertEquals("en-US",
                configuration.get(key, TenantContext.none()).orElseThrow());
        assertEquals("id-ID",
                configuration.get(key, TenantContext.tenant(TENANT_A)).orElseThrow());
        assertTrue(configuration.get(
                key,
                TenantContext.tenant(TENANT_B)).isEmpty());
    }
}
