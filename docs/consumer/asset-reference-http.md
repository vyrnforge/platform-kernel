# Asset reference consumer — HTTP request context

The Asset reference module is **test-only**. It exists to validate that a downstream product can consume the kernel without importing kernel internals or moving Asset business policy into the shared library.

The reference tests cover:

- native IAM and external IdP credentials normalizing to the same platform actor;
- tenant-scoped Asset access;
- tenantless rejection for Asset operations;
- cross-tenant membership rejection;
- cross-tenant resource hiding;
- module entitlement enforcement;
- domain permission enforcement after entitlement;
- request/correlation metadata propagation;
- safe HTTP error mapping.

The reference consumer does not define Asset persistence, Asset lifecycle, broker behavior, or an HTTP framework.
