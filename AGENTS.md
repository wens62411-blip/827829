# AB Club parallel-work guardrails

Read `README.md`, `DECISION_LOCK.md`, `docs/contracts/FROZEN.json`, `docs/contracts/file-ownership.md` and the relevant action contract before editing.

## Frozen foundation

- `app.*`, dependency/lock/config files, `miniprogram/shared/**`, `docs/contracts/**`, `cloudfunctions/_shared/**`, `database/security-rules/**` and `integration/manifests/schema.json` are foundation/integration-owned.
- Feature tasks never edit `miniprogram/app.json`; all agreed routes already exist.
- Feature tasks never add or fork a shared enum, country, city, action, error or projection. Submit a proposal under `integration/proposals/` when the 1.0.0 contract is insufficient.
- Use native WeChat TypeScript/WXML/WXSS/JSON and `tdesign-miniprogram@1.16.0` only. Do not add a Web/PWA/Taro/mpvue/uni-app client or another component library.

## Feature ownership

- Card: `miniprogram/pages/{bootstrap,me,card,card-share}/**`, `miniprogram/packageCard/**`, card-specific components, `cloudfunctions/identityApi/**`.
- Social/review requests: `miniprogram/pages/network/**`, `miniprogram/packageSocial/**`, social-specific components, `cloudfunctions/socialApi/**`.
- City/events: `miniprogram/pages/{events,event-share}/**`, `miniprogram/packageEvents/**`, event-specific components, `cloudfunctions/eventApi/**`.
- Art: art entry components, `miniprogram/packageArt/**`, art-specific components, `cloudfunctions/contentApi/**`.
- Admin: `miniprogram/packageAdmin/**`, admin-specific components, `cloudfunctions/adminApi/**`.
- `miniprogram/pages/discover/**` remains a foundation placeholder. Only final integration may compose feature manifests into it.

One path has one owner. A feature task must not modify a different feature's paths.

## Data and evidence safety

- The client never writes a business collection directly. Cloud functions derive OPENID from trusted context and check auth, role, ownership, state, optimistic version and idempotency for writes.
- Only human `APPROVED` claims may appear as public verified tags.
- Do not create fake `APPROVED`, `HUMAN_REVIEWED`, `LIVE`, payment, device, upload, deployment or release evidence.
- A formal runtime never silently falls back to synthetic data. Keep `LIVE`, `DEGRADED` and `OFFLINE_DEMO` explicit.
- Feature manifests are capped at `LOCAL_TEST_PASS` before final integration and must preserve `UNVERIFIED` gates honestly.

## Validation

Run `npm ci` followed by `npm run build`. Report every command and exit code. Local checks do not prove WeChat Developer Tools preview, device, CloudBase, upload or release status.

Cloud TypeScript is authoritative. After changing cloud source or a cloud-consumed shared contract, run `npm run build:cloud-runtime`; never hand-edit a generated cloud `.js` bundle. The normal build verifies the embedded aggregate source hash and that each function bundle has no sibling-directory runtime dependency.
