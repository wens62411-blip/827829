# Cross-module projection protocol — v1.0.0

All dependencies in this document are read-only DTO dependencies. A module may
import from `miniprogram/shared`, but never from another domain's internal path.

- `identityApi.card.getForViewer` and `identityApi.share.resolve` consume only
  `ViewerRelationshipProjection` and `PublicVerificationClaimProjection` from
  social. `identityApi` is the sole producer of `cards_public`.
- The generic `share.*` contract supports both `CARD` and `EVENT` targets.
  `share.createQrScene` binds each target kind to its matching cold-start page;
  both pages resolve `scene` or `token` through `share.resolve`. For an event
  target, the resolver consumes only the shared `PublicEventProjection`, never
  event-domain internals. The legacy-named `card_share_tokens` collection is
  the sole share-token store for both frozen target kinds in v1.0.0.
  A successful `ShareResolutionProjection` always has `revoked: false`, and
  its optional `expiresAt` must be later than `resolvedAt`; revoked or expired
  tokens return `TOKEN_REVOKED` or `TOKEN_EXPIRED` through `ApiFailure`.
- `eventApi.event.checkEligibility` consumes only active, public,
  human-approved `PublicVerificationClaimProjection` records. It cannot inspect
  evidence or accept a client-asserted label.
- `contentApi.content.listRelatedEvents` consumes only
  `PublicEventProjection`. A non-published, paused, cancelled, completed, or
  otherwise unavailable event must have `reservationAvailable: false` and must
  not be presented as reservable.
- `adminApi` consumes `ReviewCaseProjection`; admin clients never infer private
  aggregate shapes.

Every relationship removal/block, verification approval/rejection/revocation/
expiry, event publish/cancel, content publish/unpublish, and media-rights change
appends a `ProjectionInvalidation` through the shared helper. Permission
revocation and its source-state write are one transaction. Display caches may
refresh asynchronously only after being marked dirty; reads deny from source
state while dirty, so stale projection data never grants access.

The atomic revocation helper binds each invalidation kind to a concrete source
collection and that collection's exact schema fields. The v1.0.0 pairs are:

- `RELATIONSHIP_CHANGED`: `friendships.state`, or
  `blocks_reports.recordType/state` for an active block.
- `VERIFICATION_CHANGED`: `verification_requests.status`, or
  `verification_claims.reviewStatus/publicVisible`.
- `EVENT_CHANGED`: `events.state/reservationAvailable`,
  `organizers.reviewStatus`, or `club_nodes.operationalState/reviewStatus`.
- `CONTENT_CHANGED`: `art_items.publicationState` or
  `art_collections.publicationState`.
- `MEDIA_RIGHTS_CHANGED`: `media_assets.rights`; revocation replaces the
  complete rights object, removes every permitted public use, and records the
  review instant.

Cross-collection field shapes, mixed-domain fields, unexpected fields,
non-sequential versions, mismatched aggregates, and mismatched invalidation
kinds are rejected before the transaction callback can run.
