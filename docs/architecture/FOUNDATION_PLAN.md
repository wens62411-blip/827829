# Foundation implementation plan

## Goal

Maintain a native WeChat Mini Program foundation while delivering the confirmed phase-one card-first experience. Card, social, event, art and admin modules stay in disjoint paths and rely on one frozen contract.

## Module sequence and acceptance

1. **Repository baseline** — one npm lockfile, exact TDesign dependency, tourist AppID explicitly marked `LOCAL_ONLY`, no second client framework.
2. **Frozen contracts** — version 1.0.0, exactly 59 actions, one enum source, exact geo directory, typed error details, DTO metadata and projections.
3. **Runtime boundaries** — five action dispatchers return `NOT_IMPLEMENTED`; shared guards and projection invalidation helpers exist; no fake success.
4. **Phase-one navigation** — four card-first tabs (`Card`, `Network`, `Discover`, `Me`); Events and Art are secondary Discover entries; two share cold-start routes remain registered.
5. **Phase-one experience** — card editing, live preview, privacy-aware share, relationship records, restrained Discover previews and a UI-only city-group entry. Missing backend actions must never produce fake success.
6. **Data boundaries** — all 25 explicitly named collection schemas, indexes, deny-by-default client writes and the 15-row writer matrix; no approved/live fake seed. (The named list contains 25 entries, so no security-critical collection is dropped to force an incorrect count.)
7. **Evidence gates** — repeatable local checks produce only `LOCAL_TEST_PASS`; device, preview, cloud, upload and release gates remain unverified until separately verified.

## Explicit non-goals

No event booking, real city-group membership, payment, chat, feed, follower system, livestream, auction, authenticity verdict, commerce fulfilment or production deployment. Event, art and people samples remain explicitly non-live until their source and runtime evidence say otherwise.

## Risks controlled

- Shared-contract drift is caught by exact-count and docs-to-TypeScript parity tests.
- Cross-domain leakage is constrained to frozen public projections and invalidation events.
- Stale access is denied from source state while display projections are marked dirty.
- Module collisions are avoided by file ownership and a frozen route table.
- Unsupported evidence cannot be upgraded by a feature module manifest.
