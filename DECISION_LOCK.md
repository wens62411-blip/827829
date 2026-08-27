# AB Club Foundation Decision Lock

- Contract version: `1.0.0`
- Status: `FROZEN`
- Scope: foundation skeleton only; no business workflow is implemented.

## Product and geography

- The primary brand is **AB Club**.
- The two product lines are global same-city offline events and the art channel (art, antiques, jewellery).
- The frozen directory contains exactly 7 countries and 13 cities: 北京、上海、广州、深圳、杭州、苏黎世、米兰、巴黎、墨尔本、悉尼、新加坡、多伦多、温哥华.
- Directory membership and operational state are separate facts. A listed city is not evidence of an operating club node or live event.
- The hierarchy is `GLOBAL → REGION → COUNTRY_OR_AREA → CITY → AB_CLUB_NODE → EVENT`. Business records store only the shared `CityId` for their city reference.
- A public verification label is rendered only after a human `APPROVED` decision. User declarations and AI consistency checks are never presented as human approval.

## Architecture

- Client: native WeChat Mini Program using TypeScript, WXML, WXSS and JSON.
- Component library: `tdesign-miniprogram@1.16.0` only. Vant and WeUI are prohibited.
- Backend: CloudBase modular monolith with five function boundaries: `identityApi`, `socialApi`, `eventApi`, `contentApi`, `adminApi`.
- Shared contracts, routes and database ownership are frozen before feature work. Feature modules may consume but must not fork shared enums or edit `miniprogram/shared/**`.
- Client code cannot write business collections directly. Server administration capability does not replace per-action authentication, ownership, role, state, version and idempotency checks.

## P0 exclusions and evidence honesty

- Real payment is disabled by default. No real payment, chat, social feed, livestream, auction, AI authenticity verdict or heavy commerce is in scope.
- Runtime modes are only `LIVE`, `DEGRADED` and `OFFLINE_DEMO`. A formal runtime must not silently substitute synthetic data after a live failure.
- This repository starts as `LOCAL_ONLY_NO_APPID` with an intentionally empty AppID field. Developer Tools preview, iOS device, Android device, dev-version upload, CloudBase and release remain `UNVERIFIED` until corresponding evidence exists.
- Seed data must not claim `APPROVED`, `HUMAN_REVIEWED` or `LIVE` state.

Changes to this file require a contract proposal under `integration/proposals/` and approval from both `foundation` and `integration` owners.
