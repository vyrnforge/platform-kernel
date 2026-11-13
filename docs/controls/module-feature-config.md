# Module registry, feature flags, and configuration

Status: V1 framework-neutral control primitives derived from the Product Scope, Architecture, Delivery Plan, and DEC-K009/DEC-K011.

These concepts are intentionally separate. They answer different questions and must not be substituted for one another.

## ProductModule registry

The module registry answers:

> Is this a known product/module in this runtime or suite?

`ProductModule` currently carries only the stable technical `moduleKey`. `ProductModuleRegistry` is read-only from the consumer perspective.

The V1 `StaticProductModuleRegistry` is an immutable boot-time implementation. It does not require persistence or a discovery service and may later be replaced without changing the registry contract.

Registration does **not** mean:

- the tenant purchased/enabled the module;
- a user may access the module;
- a domain action is authorized.

Tenant/product availability remains the responsibility of `ModuleEntitlementPort`. Domain authorization remains the resource-owning application's responsibility.

## Module entitlement

Module entitlement answers:

> Is module X enabled for tenant Y?

This remains tenant/product availability only. It must not become a user, role, permission, or resource-level authorization system.

The existing request-context pipeline continues to enforce entitlement separately from domain authorization.

## Feature flags

Feature flags answer:

> Should this implementation feature be active in this explicit scope?

`FeatureFlagKey` must be namespaced, for example:

- `asset.bulk-import-v2`
- `platform.new-context-parser`

`FeatureFlagPort` receives an explicit `TenantContext`. `TenantContext.none()` can be used by an implementation for global/platform evaluation; a tenant context represents tenant-specific evaluation.

The contract deliberately does not define user targeting, percentage rollout, experiments, licensing, or authorization semantics. Those should not be invented until a real consumer requires them.

Feature flags must never be treated as security boundaries. A disabled flag may hide/disable an implementation path, but authorization must still be enforced independently.

## Configuration

Configuration answers:

> What non-secret setting value is stored for this exact namespaced scope?

`ConfigurationKey` must be namespaced, for example:

- `platform.locale.default`
- `asset.import.max-batch-size`

`ConfigurationPort` performs exact-scope lookup:

- `TenantContext.none()` = global/platform lookup;
- `TenantContext.tenant(id)` = tenant-specific lookup.

The kernel does **not** define implicit fallback from tenant to global configuration. A product may define explicit fallback semantics where justified, but that policy should be visible and testable rather than hidden inside the shared primitive.

Configuration values are exposed as strings in V1 so storage format, provider technology, and domain-specific parsing remain outside the kernel contract.

## Secrets

Passwords, credentials, private keys, tokens, and other secrets must not be stored through `ConfigurationPort`.

Secrets belong in a secrets manager. A product may store a non-secret reference identifier in ordinary configuration when its integration contract requires one.

## Namespaces

Configuration and feature keys require a lowercase namespace prefix separated by dots. Current canonical namespaces include:

- `platform.*`
- `iam.*`
- `asset.*`
- `itsm.*`

The validator intentionally permits future lowercase product namespaces rather than hard-coding only today's products.

## Explicitly not selected in V1

This slice does not select:

- a feature flag SaaS/provider;
- a centralized configuration service;
- a database table/schema;
- remote configuration polling;
- cache semantics;
- percentage rollout;
- experimentation/A-B testing;
- user targeting;
- secret storage;
- commercial licensing implementation.
