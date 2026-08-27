# CloudBase client security rules

`client-access.json` is a deployable-policy **draft**, not proof that any cloud
environment was configured. It chooses the strongest P0 boundary: clients do
not directly read or write any business collection and must call a registered
cloud action that returns a public/private DTO after authorization.

CloudBase documents that custom security rules govern C-end/client requests,
while server/cloud-function access runs with administrative database capability.
Therefore these rules are necessary but not sufficient: every implemented write
must still use the shared trusted-OPENID, RBAC, ownership, state, optimistic-version,
idempotency, audit, and invalidation guards.

Official references checked 2026-08-27:

- https://cloud.tencent.com/document/product/876/41802
- https://docs.cloudbase.net/en/database/security-rules/
- https://cloud.tencent.com/document/product/876/19369
