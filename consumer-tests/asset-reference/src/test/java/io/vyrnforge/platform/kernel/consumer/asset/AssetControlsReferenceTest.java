package io.vyrnforge.platform.kernel.consumer.asset;

import io.vyrnforge.platform.kernel.config.ConfigurationKey;
import io.vyrnforge.platform.kernel.context.TenantContext;
import io.vyrnforge.platform.kernel.feature.FeatureFlagKey;
import io.vyrnforge.platform.kernel.module.ProductModule;
import io.vyrnforge.platform.kernel.module.StaticProductModuleRegistry;
import io.vyrnforge.platform.kernel.testkit.InMemoryConfigurationPort;
import io.vyrnforge.platform.kernel.testkit.InMemoryFeatureFlagPort;
import io.vyrnforge.platform.kernel.testkit.InMemoryModuleEntitlementPort;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssetControlsReferenceTest {
    private static final UUID TENANT_A =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
    private static final UUID TENANT_B =
            UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ac");

    @Test
    void registrationEntitlementFeatureAndConfigurationRemainSeparate() {
        var registry = StaticProductModuleRegistry.of(
                new ProductModule("asset"),
                new ProductModule("itsm"));

        var entitlements = new InMemoryModuleEntitlementPort()
                .set(TENANT_A, "asset", true);

        FeatureFlagKey bulkImportV2 = new FeatureFlagKey("asset.bulk-import-v2");
        var flags = new InMemoryFeatureFlagPort()
                .set(bulkImportV2, TenantContext.tenant(TENANT_A), false);

        ConfigurationKey maxBatch =
                new ConfigurationKey("asset.import.max-batch-size");
        var configuration = new InMemoryConfigurationPort()
                .set(maxBatch, TenantContext.tenant(TENANT_A), "250");

        assertTrue(registry.contains("asset"));
        assertTrue(entitlements.getEntitlement(TENANT_A, "asset").enabled());
        assertFalse(flags.isEnabled(
                bulkImportV2,
                TenantContext.tenant(TENANT_A)));
        assertEquals(
                "250",
                configuration.get(
                        maxBatch,
                        TenantContext.tenant(TENANT_A)).orElseThrow());
    }

    @Test
    void tenantConfigurationAndFlagsDoNotLeakAcrossTenants() {
        FeatureFlagKey flag = new FeatureFlagKey("asset.bulk-import-v2");
        ConfigurationKey key =
                new ConfigurationKey("asset.import.max-batch-size");

        var flags = new InMemoryFeatureFlagPort()
                .set(flag, TenantContext.tenant(TENANT_A), true);

        var configuration = new InMemoryConfigurationPort()
                .set(key, TenantContext.tenant(TENANT_A), "250");

        assertFalse(flags.isEnabled(
                flag,
                TenantContext.tenant(TENANT_B)));
        assertTrue(configuration.get(
                key,
                TenantContext.tenant(TENANT_B)).isEmpty());
    }

    @Test
    void globalConfigurationIsExplicitRatherThanImplicitFallback() {
        ConfigurationKey locale =
                new ConfigurationKey("platform.locale.default");

        var configuration = new InMemoryConfigurationPort()
                .set(locale, TenantContext.none(), "en-US");

        assertEquals(
                "en-US",
                configuration.get(
                        locale,
                        TenantContext.none()).orElseThrow());

        assertTrue(configuration.get(
                locale,
                TenantContext.tenant(TENANT_A)).isEmpty());
    }
}
