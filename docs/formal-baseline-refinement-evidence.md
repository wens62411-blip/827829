# Final-baseline refinement verification

Date: 2026-09-11. Base source: `dda4b66` (`9.1最终稿`, remote main verified). Working branch: `feat/formal-baseline-refinement`.

## Product changes

- Preserve the original three tabs, editor form, themes and card design. Original tracked image bytes and entry-film artwork are unchanged.
- Only the My-page city panel uses a new European-classical architectural image. Preserve all 13 cities; explain how to join their WeChat groups through `ABclub1` and provide clipboard copying.
- Add native direct sharing to saved previews and the editor. Poster tools remain available independently.
- Visitor pages show the incoming sharer's permitted fields, with a personal-card creation CTA and accurate invalid-link states.
- Brand sharing uses a distinct Discover entry with its own 5:4 product cover.
- Remove rejected public wording and friend-relationship prompts. Dark/editor action foreground/background contrast is explicitly set.

## Automated checks

- `npm ci`: exit 0; 0 vulnerabilities reported for project dependencies.
- `npm run build`: exit 0 after the final asynchronous-cover audit fix.
- Foundation checks: 339 passed, 0 failed.
- Final tests: 397 total; 391 passed, 0 failed, 6 optional simulation tests skipped.
- Static main-package estimate: 2,079,208 bytes, under 2,097,152 bytes. All subpackage checks passed.
- Cloud source/bundle hashes match. Runtime remains `OFFLINE_DEMO`; no cloud service/environment deployment performed.

## Actual Developer Tools checks

Native WeChat Developer Tools Stable 2.02.2608040, SDK 3.17.2, iPhone 14 Pro Max simulator. These are actual renderer/runtime checks with synthetic local acceptance fixtures, not two real WeChat accounts.

- My page READY, new image loaded without error, full city list and `ABclub1` visible.
- Entered a synthetic name/profession/city/biography/custom tag through the editor controls; saved successfully and saw latest card in completed preview.
- Ink card theme retained. Actual rendered editor primary colors: `rgb(33, 30, 26)` on `rgb(215, 191, 141)` (contrast ~9.27:1).
- Clicked the actual completed-preview Share button: Developer Tools native virtual-friend send panel appeared directly, with the generated personal card image after asynchronous loading. Cancelled without sending.
- Generated actual native share descriptor: local card route with snapshot, 342-character path; valid temporary PNG containing the test name, profession, biography and public tag.
- Opened that route using the real simulator: SUCCESS, title `林雅·验收 的数字名片`; correct sender content.
- Replaced recipient's local test identity with B and reopened A: displayed A. Forwarding retained the same A path; opening as C still displayed A.
- Malformed snapshot: ERROR, `名片内容无法读取`, no card content, forwarding disabled.
- New visitor without own identity: `创建我的数字名片` opened `/packageCard/pages/edit/index?register=1` with empty name.
- Brand share descriptor returned the product title, explicit brand Discover route and new brand image.
- Debugger Errors: 0. Warnings seen were DevTools preload/hot-reload and unsupported worker telemetry notices.
- Restored pre-test app-owned storage after fixture checks; test identity is not included in project data or uploaded source.

Local artifacts: `E:\Temp\abclub-formal-refinement-verification\` contains build log, My-page screenshot, editor action screenshot, actual native send panel screenshot, personal share PNG and receiver screenshot. Screenshots include clearly labeled synthetic acceptance data.

## Review finding and resolution

An out-of-order owner-cover generation race was reproduced during independent review: A's old callback could overwrite B's latest cover. Fixed using per-load/per-cover/per-share operation generations and card/theme identity checks. Both completion orders pass the new regression. An independent rerun of the original reproduction confirms that late A results no longer overwrite B.

## Package/upload status

- Final Developer Tools preview: exit 0, `preview` success.
- Developer upload: exit 0, `upload` success, version `1.4.5`.
- Description: `基于正式稿优化名片直分享、访客资料、深色按钮及城市社群配图`.
- Preview and uploaded package agree: total 2,241,900 bytes; main 1,897,354; Card 123,310; Admin 67,164; Art 67,372; Events 32,191; Social 54,509.
- Receipts: `E:\Temp\abclub-formal-refinement-verification\preview-info.json` and `upload-info-1.4.5.json`; preview QR `preview-qr.png`.
- User's original private configuration was not committed or changed. Original tracked image assets remain byte-identical to baseline.
- Experience designation, two physical WeChat-account delivery, review submission and public release were not performed in this verification. Developer upload does not prove those steps.

## Reference

Native sharing follows Tencent CloudBase's documented `button open-type="share"`, `onShareAppMessage` path/image/promise pattern: https://docs.cloudbase.net/recipes/add-share-with-params-miniprogram .
