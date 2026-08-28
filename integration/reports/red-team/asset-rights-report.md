# RED_TEAM_A 素材权利报告

## 结论

- 城市照片：13/13 本地文件 SHA-256 与 manifest 一致；来源页、作者、许可证、credit、dimensions、alt 字段完整。所有项目仍共享 `rightsState=CLAIMED`、`reviewStatus=DRAFT`、`HUMAN_RIGHTS_REVIEW_REQUIRED`。运行时 credit 只显示“作者 · 许可证名 · Wikimedia Commons”，没有可用 source/license 链接，也没有披露 manifest 所声明的 crop/warm color grade 改作，因此人工发布权利 gate 为 `FAIL/OPEN`。
- Discover hero：1/1 本地 JPG 的 hash、116861 bytes、960×473 与独立 `hero.json` 一致，alt/author/source/license 字段存在；但仍为 `CLAIMED/DRAFT/HUMAN_RIGHTS_REVIEW_REQUIRED`。运行时不读取该 manifest，页面也不显示 Beat Ruest、CC BY-SA 4.0 或 source/license 链接，因此并入 RT-A-P1-03。hero 与苏黎世城市图共用同一 source page，不能误算成新的独立来源。
- 艺术 fallback：1/1 本地 SVG hash 匹配，明确为项目自制抽象占位图、SYNTHETIC、NOT_REAL_ARTWORK；仍为 `CLAIMED/DRAFT`，只可作为本地 demo fallback，不是公开艺术品许可或真伪证据。
- 活动：没有独立活动媒体资产 manifest；不能声称活动素材已覆盖审核。
- 景点：没有独立景点资产集合；城市照片只可按 manifest 中的 landmark/alt/credit 使用。
- 人物/机构：content schema 有来源/许可字段，但公开门缺 ReviewLog 强绑定，见 RT-A-P0-03。
- Logo：assets 中未发现二进制 Logo，当前界面使用文本 “AB”；没有可据此认定的 Logo hash/alt/商标权证据，品牌权属为 `UNVERIFIED`。
- `integrationEligible=false`。

## 城市照片核对

以下许可/作者信息沿用本目录内 2026-08-27 已保存的 Wikimedia Commons source-page 只读核对证据；本次定向重跑按用户范围未再访问外部站点。该证据只证明当时页面元数据与 manifest 相符，不代替项目方人工权利审核；新增 hero 的外部 sourceVariant 当前状态也未经本轮实时核验。

| cityId | 作者 | 许可证 | 本地 hash | source 元数据 | 人工权利审核 |
|---|---|---|---|---|---|
| cn-beijing | Güldem Üstün | CC BY 2.0 | MATCH | MATCH | PENDING/DRAFT |
| cn-shanghai | King of Hearts | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| cn-guangzhou | Tim Wu | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| cn-shenzhen | Charlie fong | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| cn-hangzhou | Wanderingchina | CC BY 4.0 | MATCH | MATCH | PENDING/DRAFT |
| ch-zurich | Beat Ruest | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| it-milan | Steffen Schmitz | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| fr-paris | Nitot | CC BY-SA 3.0 | MATCH | MATCH | PENDING/DRAFT |
| au-melbourne | Diliff | CC BY 2.5 | MATCH | MATCH | PENDING/DRAFT |
| au-sydney | Benh LIEU SONG | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| sg-singapore | Benh LIEU SONG | CC BY-SA 4.0 | MATCH | MATCH | PENDING/DRAFT |
| ca-toronto | ImagePerson | CC BY 4.0 | MATCH | MATCH | PENDING/DRAFT |
| ca-vancouver | Kyle Pearce / DIY Genius | CC BY-SA 2.0 | MATCH | MATCH | PENDING/DRAFT |

完整 source page URL 保存在 `miniprogram/assets/manifests/cities.json`，运行时使用本地文件而非热链。`components/ab-city-hero/city-media.ts:1-18` 只把作者、许可证名和来源站点拼成纯文本；`components/ab-city-hero/index.wxml:1` 没有 source/license URL 或改作披露。组件虽有 alt 与图片失败 fallback，但这些不补足许可要求。

### 权利风险

当前页面不以 `reviewStatus=APPROVED` 为显示条件，DRAFT 素材会直接出现在活动、城市目录和最新 Discover featured-city 区域。Discover 只给出泛化的“待复核”说明，没有逐图 author/license/source。因此：

- 本地 integrity gate：`PASS`
- 来源/作者/license 字段完整性：`PASS_STATIC`
- source page 元数据一致性：`PASS_WEB_METADATA`
- 人工权利审核：`UNVERIFIED/PENDING`
- 发布可用性：`FAIL`（RT-A-P1-03）

另外，manifest 的 processingProfile 声明了 crop/warm color grade。CC BY/CC BY-SA 项的最终署名呈现、许可证链接、改作说明及 SA 场景适配仍需人工逐项确认；当前纯文本 credit 不足以据此宣称发布合规。

## Discover hero 核对

`miniprogram/assets/manifests/hero.json` 声明 `discover-hero-zurich-960-v1`：

- 本地路径：`/assets/hero/zurich-960.jpg`
- 本地 SHA-256：`4348cc093352e7c13bc8bf6e5148b08580987ef13f3ca9e04f9a8669cd9101ae`（MATCH）
- 文件大小/解码尺寸：116861 bytes、960×473（MATCH）
- author/license：Beat Ruest、CC BY-SA 4.0（字段存在；本轮未联网复核）
- alt：苏黎世利马特河两岸老城与教堂天际线（存在且与本地图像静态检查一致）
- rightsState/reviewStatus/publicationPolicy：`CLAIMED / DRAFT / HUMAN_RIGHTS_REVIEW_REQUIRED`

Discover `index.wxml:3` 直接硬编码图片路径；运行时代码不读取 `hero.json`，没有权利状态门、逐图 attribution 或 source/license 链接。正式测试只接受并验证 DRAFT 声明存在，不是发布批准证据。图片也没有 `binderror`/fallback，另见 RT-A-P2-11。

## 艺术素材核对

`miniprogram/assets/manifests/art.json` 仅包含 `art-fallback-not-real-v1`：

- sourceType：`PROJECT_ORIGINAL_VECTOR`
- license：`AB_CLUB_PROJECT_OWNED_ORIGINAL`
- recordOrigin：`SYNTHETIC`
- representation：`NOT_REAL_ARTWORK`
- depictsRealArtwork：false
- aiGenerated：false
- externalHotlink：false
- SHA-256：MATCH
- width/height/alt：完整
- rightsStatus：`CLAIMED`
- reviewStatus：`DRAFT`
- rightsReviewedAt：null

因此它可以支撑“没有公开图片权利或图片失败时的非真实占位状态”，不能支撑任何真实艺术品、作者授权、真伪、估值、交易或人工审核声明。

## 来源、hash、alt、失败态检查

- 13 城市 JPG、1 个独立 Discover hero JPG 与 1 个艺术 SVG（共 15 个本地文件）的 hash 均匹配，红队测试 `asset-and-client-boundaries.test.mjs` 通过。
- 13 城市项、hero 均包含非空 alt；art fallback 包含明确的“非真实艺术品” alt。
- `ab-city-hero` 有本地图片失败 fallback；但最新 Discover 的 hero、城市卡和艺术占位 `<image>` 均没有 `binderror`/失败 fallback（RT-A-P2-11）。
- 真机图片解码、CDN/CloudBase、弱网、色彩/裁剪、屏幕阅读器实际朗读均未验证。

## 所需原 owner 处理

1. integration rights reviewer 逐项确认许可版本、署名方式、可访问的 source/license 链接、crop/color-grade 改作标注、共享相同方式要求与页面/分享场景许可，并记录 reviewer/time/evidence hash。
2. city-events 在人工批准前 fail closed 或使用明确可发布的 project-owned fallback。
   Discover/final-integration owner 也必须对新增 featured/hero 图片执行同一门禁与逐图 attribution，不能仅放一个页面级“待复核”说明。
3. art/content 的 REAL 内容与人物/机构媒体必须绑定内容 hash、媒体 hash、ReviewLog 和权利审核记录。
4. 若未来加入 Logo、活动或景点图片，先建立独立 manifest，再进入包体和发布 gate。

07A 不替代人工权利判断；本报告不会把 Commons 页面元数据存在写成权利已批准。
