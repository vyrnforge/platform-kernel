# Identity integration boundary

Any Java application can supply a trusted identity projection from its own authentication layer. No VyrnForge IAM, OIDC provider or other particular product is required.

The kernel intentionally does **not** implement provider-specific raw token validation. Signature algorithms, issuer metadata, JWKS discovery, audience rules, token formats, API-key validation, and credential revocation are owned by the native IAM/runtime authentication layer or by the supported external identity-provider adapter.

## Kernel entry point

After provider authentication succeeds, trusted middleware produces a `ValidatedIdentityCredential` containing only:

- normalized `ActorReference`;
- documented group/role/permission projections where appropriate;
- normalized authentication metadata.

`ValidatedIdentityAdapter` converts that trusted result into `ActorContext` for the requested tenant.

This is a production integration hook, unlike `StaticIdentityAdapter`, which remains test-only.

## Example: native Wyrmgate IAM (optional)

The Wyrmgate security baseline distinguishes bearer authentication from administrative/domain authorization. The kernel preserves that separation:

1. Wyrmgate authentication middleware validates the credential under Wyrmgate's current runtime authentication contract.
2. The middleware emits a provider-neutral validated identity projection.
3. The kernel establishes `ActorContext`.
4. Tenant membership is validated separately.
5. Tenant module entitlement is validated separately.
6. The owning product performs domain authorization.

The kernel does not interpret Wyrmgate control-plane roles/scopes as Asset/ITSM domain authorization.

## Any application authentication layer

The same adapter accepts validated projections from any trusted application authentication boundary, including standards-based external IdPs or an existing application session verifier. The kernel does not verify raw tokens or sessions itself. Application code maps trusted identities to stable actor references and supplies membership, entitlements and domain authorization. See the [standalone quickstart](getting-started.md).

## Security requirement

`ValidatedIdentityCredential` must only be constructed from a trusted authentication boundary. Applications must never decode an unverified token and directly construct this credential.

A future Wyrmgate SDK may provide the concrete verifier/mapper when its stable runtime token/JWKS contract is published. Adding that verifier does not change the kernel `ActorContext` contract.
