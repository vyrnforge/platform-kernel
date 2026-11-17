# JDBC JSON codec configuration and portable wire JSON

The **core** Kernel JAR has no Jackson dependency. The optional `platform-kernel-jdbc` adapter uses `JacksonRecordCodec` to persist **payloads and changes** in the product database; it does **not** automatically serialize the entire public EventEnvelope/ApiError/AuditEvent wire schema.

## Default remains unchanged

```java
JacksonRecordCodec codec = new JacksonRecordCodec();
```

The existing default mapper is JSON-object oriented and orders map keys for deterministic persisted values. It does not implicitly install Java Time modules or convert Java record field names into the public v0.2 snake_case wire convention.

## Optional application JSON configuration

For products with existing JSON DTO conventions, the JDBC adapter also accepts a configured Jackson ObjectMapper. The codec defensively copies it, disables Jackson default typing and preserves deterministic map ordering:

```java
ObjectMapper mapper = new ObjectMapper();
// Register explicitly reviewed Jackson modules and DTO policies here.
JacksonRecordCodec codec = new JacksonRecordCodec(mapper);
```

Changing the mapper configuration can change serialized payloads and their historical fingerprints. **Do not silently replace a deployed codec**: test round trips and replay/fingerprint compatibility with existing stored intents and document any migration decision. Never enable arbitrary polymorphic deserialization of untrusted content.

## Public transport JSON is a separate concern

- Map Java DTOs explicitly to the immutable `contracts/phase0/v0.2/*.schema.json` wire shapes.
- Require snake_case JSON fields, lowercase enum values, UTC timestamps with `Z`, presence of required nullable fields, and JSON **object** event payloads.
- Validate a serialized **positive** example and **negative** invalid examples with the published Draft 2020-12 schemas. A default Java record mapper is **not** proof of conformance.
- Keep product-specific mapper modules in the product or optional adapter, not the dependency-free core. No VyrnForge identity provider, broker or framework is required.
- Do not put raw credentials, tokens, sensitive actor attributes or temporary file URLs in event/audit payloads.

Use [portable contract inventory](../contracts/portable-contract-inventory.md) and [consumer conformance](consumer-conformance.md) for the exact released schema and application-specific acceptance requirements.
