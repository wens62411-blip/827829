# Entry film and card share 1.4.3 evidence

This record describes the source uploaded as WeChat Mini Program developer version `1.4.3` on 2026-09-01. It is developer-upload evidence only. It does not prove experience-version designation, an OPPO/iOS device result, review submission, public release, CloudBase production operation, or copyright clearance.

## Implemented behavior

- The entry film is guarded by an in-memory App cold-start gate. Only a normal launch whose initial path is `pages/discover/index` can consume it once.
- Card-share, event-share, card subpackage, and other deep-link launches bypass the film. A later visit or tab switch to Discover in that same launch does not replay it.
- The Discover page consumes the gate in its initial data, so the film does not wait for a later `onLoad` state flip.
- Earlier scenes retain one-tap/one-scene acceleration. Duplicate timestamps are ignored and queued taps are cleared when the manor scene begins.
- The manor scene cannot be skipped by a tap. Its native layers settle in about one second, remain still for about one second, and then the overlay automatically slides upward over 460 ms to reveal the existing Discover page.
- The city images, city order, and 92 ms city cadence remain unchanged. The next city image is still preloaded without a blur filter or scale treatment.
- Decorative year, 13-city counter, next-city label, editorial serial numbers, camera numbers, and redundant captions were removed. Main city names, collector/certificate/object copy, object names, manor image, crest, gold rules, image alt text, and the functional `轻触可加速` hint remain.
- The card editor now places `分享我的名片` directly below Save. It saves and validates the latest input first, navigates only after success, de-duplicates repeated taps, stays in the editor after validation/storage/projection failure, and blocks late navigation after the editor is unloaded.

## Automated verification

- `npm ci`: passed; 0 vulnerabilities reported.
- `npm run build`: passed.
- Foundation validation: 339 passed, 0 failed.
- Node tests: 365 passed, 0 failed; 6 optional `miniprogram-simulate` checks skipped because `jsdom` is unavailable.
- Static package estimate: main package 1,917,093 bytes and below the 2 MiB limit. This estimate is not substituted for Developer Tools evidence.

## WeChat Developer Tools verification

- Final preview: passed.
- Preview package: total 2,081,016 bytes; main 1,752,362; Admin 67,164; Art 67,372; Card 107,418; Events 32,191; Social 54,509.
- Preview QR: `E:\Temp\ab-club-v1.4.3-final-preview.png`.
- Preview QR SHA-256: `942A56B5629E87DE0AD2CADB07A3ECF4907DF324BC932A40161D6B9FF6206A47`.
- Developer upload: passed as version `1.4.3` with description `冷启动开场门禁、庄园自动上滑、名片保存后分享与文案清理`.
- Uploaded package: total 2,122,142 bytes; main 1,780,601; Admin 67,232; Art 67,372; Card 107,418; Events 45,010; Social 54,509.
- Experience-version designation: not verified. Selecting a developer upload as the experience version is a separate management-console action.
- Review submission and public release: not performed.

## Remaining real-device checks

- Scan the final preview or designated experience-version QR on the target OPPO device.
- Confirm the normal cold start begins with the film, the manor remains readable, and the upward reveal receives touch normally.
- Confirm switching `活动 / 我的 / 发现` never replays the film.
- Open a shared-card link from a fully closed Mini Program and confirm the first page is the shared card rather than Discover or the entry film.
- Edit a card, use `分享我的名片`, and confirm the share page shows the newly saved values.

