# Parallel file ownership — v1.0.0

One path has exactly one owner. Ownership is about write permission; importing
the frozen public DTO entrypoint remains allowed.

| Owner | Exclusive paths |
| --- | --- |
| foundation / final integration | `app.*`, dependency and lock files, `miniprogram/shared/**`, `docs/contracts/**`, `cloudfunctions/_shared/**`, global database rules |
| card | `pages/bootstrap`, `pages/me`, `pages/card`, `pages/card-share`, `packageCard`, card-only components, `identityApi` |
| social review | `pages/network`, `packageSocial`, social-only components, `socialApi` |
| city events | `pages/events`, `pages/event-share`, event discovery components, `packageEvents`, `eventApi` |
| art | discover art entry component, `packageArt`, art-only components, `contentApi` |
| admin | `packageAdmin`, admin-only components, `adminApi` |

`pages/discover` stays a foundation-owned stable placeholder. Only final
integration may connect activity and art manifests there. Functional modules
must never modify `shared/**`; a new shared component or contract field starts
as an integration contract-change proposal.

