package io.vyrnforge.platform.kernel.controls;

import io.vyrnforge.platform.kernel.config.ConfigurationKey;
import io.vyrnforge.platform.kernel.feature.FeatureFlagKey;
import io.vyrnforge.platform.kernel.module.ProductModule;
import io.vyrnforge.platform.kernel.context.ModuleEntitlement;
import io.vyrnforge.platform.kernel.pipeline.EndpointPolicy;
import io.vyrnforge.platform.kernel.module.StaticProductModuleRegistry;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ControlsContractTest {
    @Test
    void registryKeepsTechnicalRegistrationSeparateFromEntitlement() {
        var registry = StaticProductModuleRegistry.of(
                new ProductModule("asset"),
                new ProductModule("itsm"));

        assertTrue(registry.contains("asset"));
        assertTrue(registry.contains("itsm"));
        assertFalse(registry.contains("iam"));
        assertEquals(List.of("asset", "itsm"),
                registry.modules().stream().map(ProductModule::moduleKey).toList());
    }

    @Test
    void duplicateModuleRegistrationFailsFast() {
        assertThrows(IllegalArgumentException.class, () ->
                new StaticProductModuleRegistry(List.of(
                        new ProductModule("asset"),
                        new ProductModule("asset"))));
    }

    @Test
    void moduleKeysShareReleasedEntitlementWireGrammarAcrossPublicApis() {
        UUID tenant = UUID.fromString("019a7f0e-2234-7abc-8def-1234567890ab");
        for (String key : List.of("asset", "asset.records_v2", "asset:import", "a".repeat(128))) {
            assertEquals(key, new ProductModule(key).moduleKey());
            assertEquals(key, new ModuleEntitlement(tenant, key, true, null).moduleKey());
            assertEquals(key, EndpointPolicy.tenantModule(key, "asset.read").moduleKey());
        }
        for (String key : List.of("", "Asset", "bad key", "a".repeat(129))) {
            assertThrows(IllegalArgumentException.class, () -> new ProductModule(key));
            assertThrows(IllegalArgumentException.class, () ->
                    new ModuleEntitlement(tenant, key, true, null));
            assertThrows(IllegalArgumentException.class, () ->
                    EndpointPolicy.tenantModule(key, "asset.read"));
        }
    }

    @Test
    void featureAndConfigurationKeysMustBeNamespaced() {
        FeatureFlagKey flag = new FeatureFlagKey("asset.bulk-import-v2");
        ConfigurationKey config = new ConfigurationKey("asset.import.max-batch-size");

        assertEquals("asset", flag.namespace());
        assertEquals("asset", config.namespace());

        assertThrows(IllegalArgumentException.class, () -> new FeatureFlagKey("bulk-import-v2"));
        assertThrows(IllegalArgumentException.class, () -> new ConfigurationKey("max-batch-size"));
        assertThrows(IllegalArgumentException.class, () -> new ConfigurationKey("Asset.import.size"));
    }
}
