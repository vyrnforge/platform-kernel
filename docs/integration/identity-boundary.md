# Identity integration boundary

The kernel works with any trusted application authentication mechanism that can produce its normalized identity contract. It is not an identity provider, token verifier, user directory or authentication server. No VyrnForge IAM product is required.

## General integration

1. Validate the caller in your own trusted authentication layer, for example OIDC/JWT verification, service authentication or an authenticated session.
2. Map the verified identity into a stable `ActorReference` (actor type USER, SERVICE or SYSTEM, application actor ID, optional issuer + subject, optional display name), normalized `AuthorizationProjection` and `AuthenticationContext`.
3. Construct `ValidatedIdentityCredential` from that trusted result, then use `ValidatedIdentityAdapter` with `RequestContextPipeline`. Alternatively implement `IdentityAdapter<C>` for your credential type and perform authentication in that adapter.
4. For tenant-scoped endpoints, supply authoritative membership and module-entitlement ports. For explicitly tenantless endpoints, membership and entitlement are not evaluated, and active tenant context is rejected.
5. Supply a `DomainAuthorizationHook` for the action and resource. It is always required in the request pipeline. Groups, roles and permissions are inputs to your policy, not automatic authorization decisions.

Signature verification, issuer/JWKS discovery, audience/expiry checks, sessions, revocation and account lifecycle belong to the authentication layer. Never construct a validated credential from an unverified token or accept a caller-supplied actor projection. Do not log raw credentials. Preserve duplicate HTTP header values for validation; do not trust caller-supplied resource tenant IDs.

## Provider neutrality

The same contract can be used with an existing enterprise IdP, custom authenticated session, service authentication or a native IAM product. The kernel does not parse provider-specific claims or interpret provider administrative roles as application permissions. `StaticIdentityAdapter` is test-only.

See the [Java quickstart](quickstart.md) for a complete plain-Java example and HTTP wiring. The existing identity contract and security guarantees remain unchanged.
