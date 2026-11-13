# Observability and health conventions

Status: V1 implementation convention derived from the Security/NFR baseline. This does not select a logger, metrics backend, tracing SDK, deployment platform, or probe endpoint framework.

## Correlation

`CorrelationPropagation` provides transport-neutral helpers for:

- creating a new root business flow;
- continuing an inbound business correlation while generating a fresh request ID;
- consuming an event while preserving `correlation_id` and using `event_id` as the immediate `causation_id`;
- creating a child job/operation while preserving correlation.

`correlation_id` is the business-flow identifier. It must not be replaced by a distributed trace ID.

`traceparent` and `tracestate` remain opaque W3C tracing metadata. A framework/OpenTelemetry adapter may bind them to a tracing SDK later.

## Structured telemetry

`TelemetryAttributes` emits the standard cross-product context used by logs, metrics labels where appropriate, and trace attributes:

- `service`;
- `environment`;
- `operation`;
- `outcome`;
- `request_id` when a request exists;
- `correlation_id`;
- event/audit identifiers where applicable.

Tenant and actor identifiers are potentially identifying dimensions. `TelemetryAttributePolicy.safeDefaults()` excludes both. Products must opt in only when policy and the telemetry backend make those attributes appropriate.

Payloads, credentials, tokens, arbitrary provider claims, audit change bodies, and arbitrary request data are never copied automatically into telemetry.

Timestamp and log level remain responsibilities of the selected logging/telemetry implementation.

## Health and readiness

The kernel distinguishes:

- **LIVENESS** — whether the process/component itself should remain running;
- **READINESS** — whether the application is currently able to serve its intended traffic.

Dependency failure should normally affect readiness rather than liveness. A deployment adapter can later map these snapshots to HTTP endpoints, Kubernetes probes, or another runtime mechanism.

`HealthAggregator` converts probe exceptions into the safe code `PROBE_EXCEPTION`. Exception messages and dependency secrets are deliberately not exposed.

Probe results contain only:

- `UP` or `DOWN`;
- a safe machine-readable code.

No SLO, latency threshold, or dependency list is guessed by the kernel. Each product/deployable registers only the probes required for its actual runtime.
