# City group membership contract change proposal

- Requesting modules: `card` (entry surface) and `city events` (club-node owner)
- Current authoritative contract: `1.0.0`
- Required owners for acceptance: `foundation`, `integration`
- Status: `PROPOSED_ONLY`

This proposal does not change the frozen 1.0.0 contract. Until both owners
accept and freeze a replacement contract, the "所在城市群" surface is an
honest local/offline preview only. It must not claim that a request was stored,
approved, joined, or that a WeChat group is live.

## 1. Product boundary

The first release adds one entry under `我的` for the user's selected city. It
supports a controlled request to join the corresponding AB Club city group.
It is not an in-app chat, public feed, follower graph, or automatic group join.

The client may display a city-group entry only when it can bind the city to a
frozen `CityId`. A city being listed in the global directory is not proof that
a real group or operating club node exists.

## 2. Proposed eventApi actions

Add the following authenticated actions to `eventApi`:

- `clubNode.getMyMembership`
  - Request: optional `cityId`; omission uses the user's current profile city.
  - Response: redacted club-node summary plus the caller's membership/request
    state. It never returns a public group QR code.
  - Writable collections: none.
- `clubNode.requestMembership`
  - Request: `cityId`, `expectedNodeVersion`, `idempotencyKey`, and explicit
    consent to the city-group rules.
  - Response: the caller-owned request projection with server timestamps.
  - Writable collections: `club_node_membership_requests`, `idempotency_keys`,
    `audit_logs`.
- `clubNode.withdrawMembershipRequest`
  - Request: request ID, expected version, and idempotency key.
  - Response: the withdrawn caller-owned request projection.
  - Writable collections: `club_node_membership_requests`, `idempotency_keys`,
    `audit_logs`.
- `clubNode.getJoinHandoff`
  - Available only to an authenticated user whose membership is currently
    approved for the exact club node.
  - Returns a short-lived, single-user handoff or an approved concierge route;
    never a reusable public QR code or a raw administrator contact list.
  - Writable collections: `idempotency_keys`, `audit_logs` only when a handoff
    is issued.

All write actions require server-derived OPENID, ownership checks, exact state
validation, optimistic versioning, idempotency, and audit logs.

## 3. Proposed storage and states

Add `club_node_membership_requests`, owned by `eventApi` with review-state
collaboration by `adminApi`.

Required fields:

- `_id`, `userId`, `clubNodeId`, `cityId`
- `status`: `SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | WITHDRAWN | REVOKED`
- `rulesConsentVersion`, `version`, `createdAt`, `updatedAt`

Add a unique active-request index on `(userId, clubNodeId)` so retries or
concurrent taps cannot create duplicate requests. `clubNodeId` and `cityId`
must be resolved and cross-checked by the server; the client cannot invent an
operating node.

Approval may occur only for a club node whose operational and review states
permit membership. `PLANNED`, `RECRUITING_HOST`, `PAUSED`, `DISABLED`, rejected,
or unreviewed nodes must fail closed and expose no join handoff.

## 4. Privacy and abuse controls

- Group QR codes and invite links are never public page fields or durable
  client configuration.
- A handoff expires, is bound to one approved user, and is rate limited.
- City changes do not silently move a user between groups or auto-submit a new
  request.
- Blocking/removing a friendship does not automatically change group
  membership; moderation and membership revocation are explicit audited
  actions.
- The client never reveals a member list, phone number, WeChat ID, or common
  contact merely because the user opened the city-group page.
- Offline/demo state is labeled locally and cannot be upgraded to `LIVE` by a
  client-side flag or cached value.

## 5. Backward compatibility and migration

The proposal is additive. Existing 1.0.0 clients continue to omit the city-group
surface or show it as unavailable. After approval:

1. Freeze the new DTOs, actions, state enum, collection owner, indexes, security
   rules, and error codes in a new contract version.
2. Add eventApi handlers and self-only/admin-authorized queries.
3. Add administrator review actions and immutable audit entries.
4. Connect the `我的` page only after the runtime can return an authoritative
   request state and secure handoff.
5. Keep every listed city without an approved operating node unavailable.

No existing local preview state is migrated into a real request or membership.

## 6. Required tests after acceptance

- Unknown/free-text city IDs and mismatched city/node pairs are rejected.
- Duplicate taps and concurrent requests produce one active request.
- A user cannot read, withdraw, or obtain a handoff for another user's request.
- Unapproved or non-operational club nodes expose no join handoff.
- Only `APPROVED` membership can obtain a short-lived user-bound handoff.
- Expired/replayed handoffs, public QR fields, raw group links, and client
  assertions of `APPROVED` or `LIVE` are rejected.
- Switching cities never auto-joins or silently migrates membership.
- Offline/demo UI never claims that a server write or real group join occurred.
