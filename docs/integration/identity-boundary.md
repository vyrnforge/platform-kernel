# Identity integration boundary

Status: V2 release boundary.

The kernel intentionally does **not** implement provider-specific raw token validation. Signature algorithms, issuer metadata, JWKS discovery, audience rules, token formats, API-key validation, and credential revocation are owned by the native IAM/runtime authentication layer or by the supported external identity-provider adapter.

## Kernel entry point

After provider authentication succeeds, trusted middleware produces a `ValidatedIdentityCredential` containing only:

- normalized `ActorReference`;
- documented group/role/permission projections where appropriate;
- normalized authentication metadata.

`ValidatedIdentityAdapter` converts that trusted result into `ActorContext` for the requested tenant.

This is a production integration hook, unlike `StaticIdentityAdapter`, which remains test-only.

## Native Wyrmgate IAM

The Wyrmgate security baseline distinguishes bearer authentication from administrative/domain authorization. The kernel preserves that separation:

1. Wyrmgate authentication middleware validates the credential under Wyrmgate's current runtime authentication contract.
2. The middleware emits a provider-neutral validated identity projection.
3. The kernel establishes `ActorContext`.
4. Tenant membership is validated separately.
5. Tenant module entitlement is validated separately.
6. The owning product performs domain authorization.

The kernel does not interpret Wyrmgate control-plane roles/scopes as Asset/ITSM domain authorization.

## External identity providers

The same adapter accepts validated projections from supported standards-based external IdPs. Product/domain code therefore does not depend on provider-specific token claim shapes.

## Security requirement

`ValidatedIdentityCredential` must only be constructed from a trusted authentication boundary. Applications must never decode an unverified token and directly construct this credential.

A future Wyrmgate SDK may provide the concrete verifier/mapper when its stable runtime token/JWKS contract is published. Adding that verifier does not change the kernel `ActorContext` contract.
