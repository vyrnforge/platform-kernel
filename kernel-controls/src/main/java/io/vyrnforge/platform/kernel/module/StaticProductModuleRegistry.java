package io.vyrnforge.platform.kernel.module;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * Immutable in-process registry suitable for V1 boot-time module registration.
 * Persistence/discovery can replace this implementation without changing the registry contract.
 */
public final class StaticProductModuleRegistry implements ProductModuleRegistry {
    private final Map<String, ProductModule> modules;

    public StaticProductModuleRegistry(Collection<ProductModule> modules) {
        Objects.requireNonNull(modules, "modules");
        LinkedHashMap<String, ProductModule> byKey = new LinkedHashMap<>();

        for (ProductModule module : modules) {
            Objects.requireNonNull(module, "module");
            ProductModule previous = byKey.putIfAbsent(module.moduleKey(), module);
            if (previous != null) {
                throw new IllegalArgumentException(
                        "Duplicate product module: " + module.moduleKey());
            }
        }

        this.modules = Collections.unmodifiableMap(byKey);
    }

    public static StaticProductModuleRegistry of(ProductModule... modules) {
        return new StaticProductModuleRegistry(List.of(modules));
    }

    @Override
    public Optional<ProductModule> find(String moduleKey) {
        if (moduleKey == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(modules.get(moduleKey));
    }

    @Override
    public List<ProductModule> modules() {
        return List.copyOf(modules.values());
    }
}
