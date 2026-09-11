# AB Club final-baseline refinement

## Baseline and scope

- Source baseline: `dda4b66ed616f8e7a6d0c3bac218b21278c8cb54`, `origin/main`, commit title `9.1最终稿` (verified against remote on 2026-09-11).
- Work branch: `feat/formal-baseline-refinement`.
- Previous `0123722` work is retained on `feat/share-entry-separation`; this change starts from the final baseline rather than reverting remote history.
- The user's formal-review description is not independently proven by Git. Existing evidence records developer upload 1.4.3, not public approval.
- Preserve the existing three tabs, page hierarchy, editor form, entry-film design, cities, and card customization. Apply only the requested functional and visual changes.
- Image scope clarified by user: replace only the My-page city-panel image. Retain every other existing page/entry-film/personal-card image byte-for-byte. The separately requested brand share thumbnail is a new asset, not a replacement of other page photography.

## Implementation modules

1. **My page**: preserve the profile summary, city-list panel and settings. Replace the city image with a sharp European classical scene. Keep all 13 cities. Under the city list say `以上城市均设有微信群，入群请添加负责人微信：ABclub1。` and provide a working copy action.
2. **Card owner/editor**: save and validate current form; provide direct native sharing on the completed preview; retain separate optional poster/save tools. Correct both OS-dark and selected-card-theme action contrast without redesigning the form.
3. **Card recipient**: use the incoming card identity/snapshot, never fall back to the recipient's own card. Use a sharer-specific title, render permitted fields, retain fail-closed invalid-entry handling, and offer `创建我的数字名片`.
4. **Brand sharing**: separate the brand path/entry film from card links. Provide a premium ivory/ink/champagne brand cover that communicates digital cards, personalized expression and global Chinese connections without personal data.
5. **Copy**: remove public `清除` and `克制` wording and misleading visitor friend-relationship text. Keep functional explanations accurate.

## Validation and completion

- Run `npm ci`, type/contract/build/test/package checks; distinguish skipped checks from passed checks.
- Regression: latest saved fields in share, owner/visitor separation, A-to-B-to-C forwarding, invalid paths, dark actions, city contact copy success/failure, brand entry vs card entry.
- Use the actual WeChat Developer Tools project to inspect affected pages and generate a preview package/QR. Record source commit and results.
- Produce local reviewable screenshots/share assets, then carry forward the authorized developer-upload and GitHub workflow. Formal review/publishing is not inferred from a development upload.
- Cloud account/production availability stays as the baseline actually provides; do not silently invent cloud records or verification evidence.
