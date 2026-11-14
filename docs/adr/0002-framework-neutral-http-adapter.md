# ADR-0002 — Framework-neutral HTTP adapter

- **Status:** Accepted for V1 implementation
- **Date:** 2026-11-13
- **Scope:** replaceable implementation choice, not a platform invariant

**Distribution update:** [ADR-0004](0004-distribution-and-publication.md) supersedes the historical Maven module/artifact packaging described below. The original runtime and boundary decisions remain valid.

## Context

Milestone 1 needs a real web-edge integration for request context without coupling `kernel-core` to Spring, Jakarta Servlet, Netty, or any identity-provider SDK.

The canonical standards require provider-neutral identity, explicit tenant context, request/correlation IDs, safe API errors, and domain-owned authorization. They do not require a particular Java web framework or production header convention.

## Decision

Add `platform-kernel-http` as a framework-neutral adapter that:

- reads HTTP request metadata without depending on a web framework;
- extracts a credential through a pluggable `HttpCredentialExtractor`;
- provides a default Bearer token extractor without parsing or logging the token;
- resolves explicit tenant context;
- accepts or generates a UUIDv7 correlation ID and always generates a new request ID;
- preserves W3C `traceparent` / `tracestate` as optional observability metadata;
- calls the existing `RequestContextPipeline`;
- emits response request/correlation headers;
- maps kernel access failures to safe HTTP status + `ApiError` responses.

V1 default header names are configurable and therefore do not become permanent platform contracts.

## Security behavior

- Missing/malformed credentials fail closed.
- Multiple values for security-sensitive context headers are rejected.
- Tenant and correlation identifiers must be canonical UUIDv7 when supplied.
- Tenant/resource mismatches map to 404 by default to reduce cross-tenant resource disclosure.
- Tokens and raw provider claims are never included in error bodies.
- Domain authorization remains a product hook after membership and entitlement checks.

## Consequences

Framework-specific adapters can be introduced later as thin wrappers around this module. A Spring adapter, for example, should convert the framework request into `HttpRequestMetadata` and delegate rather than duplicate tenant/authentication semantics.

Changing the V1 default header names is an implementation/configuration change unless a later decision promotes them into a public wire contract.
