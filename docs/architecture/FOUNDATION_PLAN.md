# Foundation implementation plan

## Goal

Create a native WeChat Mini Program skeleton that lets card, social, event, art and admin tasks work in disjoint paths while relying on one frozen contract.

## Module sequence and acceptance

1. **Repository baseline** — one npm lockfile, exact TDesign dependency, tourist AppID explicitly marked `LOCAL_ONLY`, no second client framework.
2. **Frozen contracts** — version 1.0.0, exactly 59 actions, one enum source, exact geo directory, typed error details, DTO metadata and projections.
3. **Runtime boundaries** — five action dispatchers return `NOT_IMPLEMENTED`; shared guards and projection invalidation helpers exist; no fake success.
4. **Navigation skeleton** — all main and subpackage routes are registered once, five tabs only, two share cold-start routes, art entered from Discover.
5. **Data boundaries** — all 25 explicitly named collection schemas, indexes, deny-by-default client writes and the 15-row writer matrix; no approved/live fake seed. (The named list contains 25 entries, so no security-critical collection is dropped to force an incorrect count.)
6. **Evidence gates** — repeatable local checks produce only `LOCAL_TEST_PASS`; device, preview, cloud, upload and release gates remain unverified.

## Explicit non-goals

No card editor logic, relationship workflow, event booking, art intent workflow, admin review workflow, payment, chat, feed, livestream, auction, authenticity verdict, commerce fulfilment or production deployment.

## Risks controlled

- Shared-contract drift is caught by exact-count and docs-to-TypeScript parity tests.
- Cross-domain leakage is constrained to frozen public projections and invalidation events.
- Stale access is denied from source state while display projections are marked dirty.
- Module collisions are avoided by file ownership and a frozen route table.
- Unsupported evidence cannot be upgraded by a feature module manifest.
