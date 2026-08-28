# RED_TEAM_A 安全与质量发现

- 审计模式：`RED_TEAM_A`
- 基线：`main@da8d5afda651d3396d26f082e4e24481d68850f4`
- 合同版本：`1.0.0`
- 审计时间：`2026-08-28`（当前工作树定向重跑）
- 问题状态：全部为 `OPEN`
- `unresolvedP0=4`
- `contractDrift.total=8`（P1 4 类，P2 4 类）
- `integrationEligible=false`

> 红队隔离测试中的 `PASS` 表示复现断言成立；它不把对应业务 gate 提升为 PASS。业务代码、共享合同、正式测试和 integration manifest 均未被红队修改。

> 当前被审计输入是上述 commit 加一棵在审计期间扩展并最终稳定的 dirty worktree：红队目录外共 55 个路径（48 tracked、7 untracked）。红队未修改或回退它们；完整路径和 dirty-tree 指纹见 `test-summary.json`。最终 AppID 为空，符合 `LOCAL_ONLY_NO_APPID`，但不构成预览/上传证据；最终 built npm 不存在。

> 按用户最新范围，本轮不检查网络基础设施或线上网络安全；域名、TLS、端口、真实接口探测和生产渗透均未执行，并保持 `UNVERIFIED/OUT_OF_SCOPE`。下文安全结论仅覆盖仓库内应用权限、数据边界、合同与合成运行时。

## P0

### RT-A-P0-01：公开认证投影不携带 ReviewLog 与用户公开授权证明

- 严重度：`P0`
- 状态：`OPEN`
- 所有者：foundation/shared-contracts/component/discover、social-review、card/identity、city-events
- 复现：向 identity adapter 注入一个仅含 `APPROVED + HUMAN_REVIEWED + publicVisible=true` 的 claim，不提供 ReviewLog 或用户公开 opt-in；刷新名片后以陌生人读取。
- 影响：种子、迁移、错误 adapter 或被污染的记录可以伪造“人工审核”认证；同一公共 claim 还可被活动资格逻辑消费。最新 UI 又把该不可信状态明确显示成“✓ … · 人工审核”，扩大到直接用户可见的真实性声明。
- 证据：`miniprogram/shared/types/projections.ts:65-75` 的 DTO 没有审核链字段；`cloudfunctions/_shared/projections/index.ts:492-508` 只校验状态、可见性和有效期；`cloudfunctions/identityApi/domain.ts:355-382` 与 `cloudfunctions/identityApi/service.ts:464-465,900-901` 直接消费该投影；`miniprogram/components/ab-verified-tag/index.ts:13-18` 与 `index.wxml:1` 仅凭两个状态显示“人工审核”，Discover 还给出绝对保证文案。隔离动态复现见 `tests/approval-provenance-bypass.test.mjs`。
- 建议：由冻结合同定义不可伪造的审核证明引用（ReviewLog id/version/hash、reviewedBy/At/scope、source version）及用户公开授权版本；card/event 消费端必须再次校验绑定关系、撤销状态和 freshness，缺任一字段即 fail closed。

### RT-A-P0-02：审核详情没有可审计材料访问能力，但审批仍可成功

- 严重度：`P0`
- 状态：`OPEN`
- 所有者：admin、foundation/shared-contracts、social-review
- 复现：reviewer 调用 `review.get`，响应只有 `evidenceAssetIds`，没有短期读取 grant、材料快照或访问审计 id；随后直接调用 `review.approve`，系统生成 `APPROVED` 与 ReviewLog。
- 影响：系统可以产生表面完整的 HUMAN_REVIEWED/ReviewLog，却无法证明审核人实际获得并查看了所需材料；“人工审核”真实性不可成立。
- 证据：`cloudfunctions/adminApi/service.ts:396-419` 仅检查提交者和 evidence id；`cloudfunctions/adminApi/service.ts:755-888` 的审批路径在服务端读取 snapshot，但未要求 reviewer 的材料访问证明；`cloudfunctions/adminApi/service.ts:1033-1040` 的 `review.get` 只返回 ReviewCaseProjection；`miniprogram/packageAdmin/lib/admin-view-model.ts:91` 明确页面没有原始快照或临时查看令牌。隔离动态复现见 `tests/admin-material-access-gap.test.mjs`。
- 建议：新增只读、短期、单案绑定的材料访问合同与 append-only 访问审计；审批命令必须引用仍有效的访问审计/材料 hash 与版本，并在事务内核验，不向客户端或日志返回长期 URL。

### RT-A-P0-03：REAL 公开内容不要求 HUMAN_REVIEWED 或 ReviewLog

- 严重度：`P0`
- 状态：`OPEN`
- 所有者：art/contentApi、admin/content-review、foundation/shared-contracts
- 复现：把合成 fixture 复制成 `recordOrigin=REAL`，保留 `PUBLISHED + publicVisible=true + verificationState=NOT_APPLICABLE`，且不创建 ReviewLog；调用 `content.list` 或 `content.get`。
- 影响：活动、艺术品、人物或机构内容可仅靠字段/种子被描述为 REAL 并公开，绕过人工审核真实性边界。
- 证据：`cloudfunctions/contentApi/service.ts:518-527` 的公开候选门只有 PUBLISHED 与 publicVisible；`cloudfunctions/contentApi/service.ts:531-565` 接受 VerificationState 全枚举；`cloudfunctions/contentApi/service.ts:975-1036` 直接公开投影。既有 `tests/cloud/content/content-api.test.mjs:305-323` 明确验证 `REAL + NOT_APPLICABLE` 可返回；红队静态复现见 `tests/truth-and-event-boundaries.test.mjs`。
- 建议：公开 REAL 内容必须绑定成功的人审记录、审核范围、内容/媒体 hash、来源版本和权利审批；NOT_APPLICABLE、AI-only、缺日志和过期/撤销审核全部拒绝。

### RT-A-P0-04：艺术详情可把 SYNTHETIC 活动当作正式关联活动展示

- 严重度：`P0`
- 状态：`OPEN`
- 所有者：art/contentApi、city-events、foundation/shared-contracts
- 复现：提供 `SYNTHETIC + NOT_APPLICABLE + PUBLISHED` 的 PublicEventProjection，readState 可读并与内容关联；调用 `content.listRelatedEvents`，再经艺术详情 model 渲染。
- 影响：LIVE 路径可无 DEMO 标识地展示合成活动并引导进入活动详情，混淆真实运营与测试内容。
- 证据：`cloudfunctions/contentApi/service.ts:1105-1141` 只检查 readable、关联 id、state/publicationState；`tests/cloud/content/content-api.test.mjs:38-57,326-335` 的合成活动被返回；`miniprogram/packageArt/services/content-client.ts:200-212` 不要求 HUMAN_REVIEWED。审计期间进入的候选改动在 `model.ts:259-268` 保留了 origin，但仍丢 verificationState；`pages/detail/index.ts:232-241` 只在 OFFLINE_DEMO 特判 SYNTHETIC，LIVE 不拒绝，相关活动 WXML 也不向用户显示该 origin。隔离复现见 `tests/truth-and-event-boundaries.test.mjs`。
- 建议：服务端关联活动门强制 `REAL + HUMAN_REVIEWED` 及审核绑定；客户端保留证据维度并在 LIVE 中 fail closed，在 OFFLINE_DEMO 中显式展示 DEMO_ONLY。

## P1

### RT-A-P1-01：多个模块把原始 OPENID 持久化到幂等 namespace

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：foundation/cloud-shared、social-review、admin、city-events、art/contentApi
- 复现：执行任一写 action 并检查 idempotency record 的 namespace。
- 影响：幂等表、备份或诊断输出泄露微信身份标识；泄露面横跨多个集合。
- 证据：`cloudfunctions/_shared/idempotency/index.ts:46-61` 拼接 `input.openId`；social `:881-920`、event `:1092-1097,1193-1198`、content `service.ts:1166-1179,1271-1283` 使用该值；admin 在 `service.ts:576-582` 自行拼接。identity 已在 `domain.ts:586-588` 先摘要，可作为最小模式。
- 建议：改用带域 HMAC/不可逆 principal digest，设置 TTL；迁移旧记录时禁止记录原 namespace，并补“序列化存储不含 OPENID”的模块测试。

### RT-A-P1-02：报名与审计记录 id 可碰撞

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：city-events/eventApi、foundation/audit
- 复现：使用合法 110 字符 eventId，分别以两个 userId 生成 ``enrollment_${eventId}_${userId}`.slice(0,120)``，结果完全相同；复用 requestId 跨 action 也会得到相同 `audit_${requestId}`。
- 影响：真实数据库可能插入失败、覆盖或把报名/审计归属混淆；内存 store 的复合 Map key/array 掩盖风险。
- 证据：`cloudfunctions/eventApi/index.ts:1154,1165,1254`；隔离算法复现见 `tests/truth-and-event-boundaries.test.mjs`。
- 建议：使用带域 hash 或服务端随机 id；对 `(eventId,userId)` 建唯一复合索引；审计 id 包含 action/principal/request 或随机 append-only id，并补真实适配器冲突负测。

### RT-A-P1-03：城市与 Discover hero 照片仍为 DRAFT，却没有运行时权利发布门

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：city-events/assets、foundation/discover、integration rights reviewer
- 复现：打开活动/城市/Discover 页；13 张城市图片、首页 featured 图片和独立 hero 会直接渲染，而 manifests 仍为 `CLAIMED + DRAFT + HUMAN_RIGHTS_REVIEW_REQUIRED`。
- 影响：若直接进入发布包，会公开尚未完成人工许可/署名审核的第三方素材；Discover 的 featured/hero 展示没有逐图 author/license/source 呈现，也没有读取 manifest 执行运行时门禁。
- 证据：`miniprogram/assets/manifests/cities.json` 的 `evidenceStatus/rightsProfile`；新增 `miniprogram/assets/manifests/hero.json:1-24` 也明确 DRAFT；`miniprogram/pages/events/index.ts:119-130`、`miniprogram/packageEvents/pages/city/index.ts:75-86`、`components/ab-city-hero/index.wxml:1`，以及 Discover `index.ts:3-7` / `index.wxml:3,60-70`。hero 与 13/13 城市文件的本地 hash 匹配，但页面级“待复核”及测试接受 DRAFT 都不能替代权利审批或逐图署名。本轮按用户范围未重新访问外部 source page。
- 建议：仅 RIGHTS_APPROVED 素材可打包/展示，或让 release gate 强制所有资产人工审核完成；保留 attribution、source page、license、hash 和 alt。

### RT-A-P1-04：manifest 合同无法记录 changedPaths 与结构化测试执行证据

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：foundation/integration
- 复现：为任一 02–06 manifest 添加 `changedPaths`，现有 schema 因 `additionalProperties=false` 拒绝；不添加则无法满足 Prompt 07。
- 影响：无法机器核验文件所有权、变更范围、命令退出码、环境、时间与源版本；字符串 evidence 可被过期或误引用。
- 证据：`integration/manifests/schema.json:6-65,98-113,158-166`；六份现有 manifest 均无 changedPaths；隔离测试 `tests/contract-drift.test.mjs`。
- 建议：下一合同版本加入 repo-relative、tracked、owner-checked changedPaths 与 executions[]（command、exitCode、observedAt、environment、sourceRevision、evidencePath）。

### RT-A-P1-05：phase、overall 与 gate 的非法组合仍能通过 schema

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：foundation/integration
- 复现：Ajv `strict:false` 会接受 `FEATURE_MODULE + LOCAL_TEST_PASS + 全 gate PASS`、`FEATURE_MODULE + BLOCKED + 全 gate PASS` 和 `FOUNDATION + RELEASED`。
- 影响：模块可用 schema-valid 证据越过被授权的发布阶段上限。
- 证据：`integration/manifests/schema.json:67-94` 与 `docs/contracts/execution-evidence.schema.json:28-67`；隔离测试 `tests/contract-drift.test.mjs`。
- 建议：为 phase 设双向 ceiling/floor；高阶 gate PASS 只能由授权的 FINAL_INTEGRATION 证据声明，并补上述三个负测。

### RT-A-P1-06：manifest 未绑定 source revision，当前 tree 与历史结论冲突

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：foundation/integration、card、social-review、events、art、admin
- 复现：对比旧 manifest 与本轮同一 dirty tree 的连续重跑：typecheck 先 FAIL 后 PASS；foundation validator 先为 336/337 FAIL、最终为 337/337 PASS；静态包体又经历 2,096,905 PASS、2,134,322 FAIL、734,176 PASS、852,907 PASS、854,028 PASS，最终 source-only 口径为 855,806 PASS；built npm 也由存在变为最终不存在。所有原 manifest 都没有 source revision 或当前 changedPaths。
- 影响：无法判断报告是当时真实历史还是当前可用证据，07B 也无法可靠把修复 diff 绑定到复测结果。
- 证据：`integration/manifests/card.json:13,16,212-213`、`art.json:14`、`events.json:15`、`admin.json:158-160`；schema 只有 generatedAt，没有 sourceRevision；本轮 package 脚本自身也有 dirty diff。中间快照曾有约 1,490,789 bytes 的物理 `miniprogram_npm`，最终快照已移除；两种状态都没有 Developer Tools 权威包体证据。完整命令历史见 `test-summary.json`。
- 建议：所有命令证据绑定 commit/tree hash；原 owner 重跑并更新 manifest，同时保留历史失败 ledger。

### RT-A-P1-07：card 的必需本地合同仍为 FAIL

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：card、foundation/shared-contracts
- 复现：读取 card manifest；overall 为 INCOMPLETE、local gate 为 FAIL，rich profile DTO/visibility、expectedVersion 与生产 adapter 等必需检查未完成。
- 影响：即使当前局部 privacy/share 单测通过，也不能宣称完整名片模块合同或生产适配器已满足。
- 证据：`integration/manifests/card.json` 的 4 个 FAIL 与 2 个 UNVERIFIED checks；`test-summary.json` 的 manifest matrix。
- 建议：由 card/foundation owner 依文件所有权修复合同缺口，重跑原模块合同、组件、云函数与负向测试并更新原 manifest；红队不代改。

### RT-A-P1-09：头像媒体只按 asset id 查询，缺少所有者与用途绑定

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：identity/card、media
- 复现：为 Bob 的合成媒体 id 提供 approved URL；Alice 在 `profile.updateMine` 中提交该 id，再刷新公共名片。
- 影响：知道或猜到其他用户媒体 id 的用户可把外部资产绑定为自己的头像并公开其 URL；同时可能跨用途复用私密媒体。
- 证据：`cloudfunctions/identityApi/service.ts:718-723` 只校验 id 格式，`:787-808` 写入 profile，`:905-913` 只用 id 查询 URL；`cloudfunctions/identityApi/domain.ts:170-185` 的读取合同不含 owner/purpose。隔离动态复现见 `tests/object-purpose-boundaries.test.mjs`。
- 建议：头像写入与投影刷新都校验媒体 owner、AVATAR purpose/domain、上传/批准/撤销状态；查询需绑定 principal 与用途并对失败统一返回安全错误。

### RT-A-P1-10：认证私密材料可被跨用途复用为举报证据

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：social-review、media
- 复现：为认证草稿申请并上传 `domain=VERIFICATION` 的私密媒体，再把同一 id 传入 `report.create.evidenceAssetIds`。
- 影响：高敏认证材料可在未取得独立用途授权的情况下进入举报记录与其留存/审核流程，破坏目的限制与最小化原则。
- 证据：`cloudfunctions/socialApi/index.ts:1320-1326` 只检查存在、owner、uploaded/expiry，不检查 `domain=REPORT`；认证上传在 `:1467-1483` 明确写入 `domain=VERIFICATION`。隔离动态复现见 `tests/object-purpose-boundaries.test.mjs`。
- 建议：为 REPORT 建独立上传策略和 purpose binding；拒绝 VERIFICATION/AVATAR 等跨域资产，并覆盖跨用户、跨举报、过期和重放负测。

### RT-A-P1-11：认证“PHYSICAL”撤销仍保留媒体记录及历史引用

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：social-review、media、privacy/compliance
- 复现：认证草稿上传媒体，并利用 RT-A-P1-10 建立举报引用；调用 `verification.withdraw` 后请求消失且响应称 `deletionMode=PHYSICAL`，但 mediaAssets 与举报 evidenceAssetIds 仍保留。
- 影响：删除语义与实际留存不一致，用户无法判断材料是否真正删除；历史引用可延长敏感材料生命周期。当前证据只证明记录/引用留存，不宣称其已对公众泄漏。
- 证据：`cloudfunctions/socialApi/index.ts:1623-1648` 只删除 verification request 并写 invalidation，没有删除/吊销媒体或清理引用；隔离动态复现见 `tests/object-purpose-boundaries.test.mjs`。
- 建议：由人工隐私/合规 owner 冻结留存合同；若为物理删除则同事务吊销媒体与不合法引用，若依法保留则改为准确的 tombstone/retention 状态并限定访问目的、期限和审计。

### RT-A-P1-12：07A 未通过时已越过文件所有权执行最终 Discover 集成

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：foundation/final integration
- 复现：对比冻结所有权与当前 Discover：要求 placeholder 的 foundation 路径已直接组合 card、network、events、art 及 13 城 demo；仓库没有 FINAL_INTEGRATION manifest，07B 也尚未发生。
- 影响：在 `unresolvedP0>0` 时提前完成相当于 Prompt 08 的入口组合，模块修复 diff、owner 边界与最终 gate 无法追溯。
- 证据：`AGENTS.md:19`、`docs/contracts/file-ownership.md:15-18`；`miniprogram/pages/discover/index.ts:29-44`、`index.wxml:29-98`；`tests/components/discover/home-page.test.mjs:7-40`；隔离复现见 `tests/contract-drift.test.mjs`。
- 建议：在 07B eligible 前恢复/隔离 placeholder；最终组合必须由 Prompt 08 owner 以 FINAL_INTEGRATION manifest、changedPaths、source revision 和完整 gate 证据执行。

### RT-A-P1-13：关系撤销或拉黑后的失败刷新可继续显示 FRIENDS_ONLY 缓存

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：social-review/network client、social friend UI
- 复现：先以 ACCEPTED 关系加载含 headline/avatar/biography 的卡片；随后由对方或另一设备删除好友/拉黑，并让本端刷新失败。network catch 不清 acceptedPreview；friend 详情只有 onLoad，刷新失败也不清 card/claims。
- 影响：授权已经失效时，当前会话仍可能继续展示先前缓存的 FRIENDS_ONLY 字段；这不是服务端 IDOR，但属于撤销后客户端最小权限与缓存回收失败。
- 证据：服务端只对 ACCEPTED 投影可选字段，见 `cloudfunctions/socialApi/index.ts:841-856,1048-1069`；`miniprogram/pages/network/index.ts:115-123` 成功缓存后 catch 只写 error；`packageSocial/pages/friend/index.ts:93-123` 无 onShow 且失败不清 card/claims；其 WXML 在 card 存在时继续渲染。隔离静态复现见 `tests/object-purpose-boundaries.test.mjs`。
- 建议：页面进入/回前台先清敏感投影或标为不可渲染，再完成重新授权；任何刷新失败、关系 invalidation、对方 block/remove 都清 acceptedPreview/card/claims，服务端响应版本与客户端缓存绑定，并补跨设备撤销负测。

### RT-A-P1-14：OFFLINE_DEMO Discover 分享卡丢失 DEMO 边界

- 严重度：`P1`
- 状态：`OPEN`
- 所有者：foundation/discover、truth/operations
- 复现：Discover 数据永久设为 OFFLINE_DEMO，但调用 `onShareAppMessage` 得到标题“全球可信连接与城市文化”，标题与 path 均没有 DEMO/本地展示限定。
- 影响：分享卡脱离页面内免责声明后，把本地合成体验描述为无条件的全球可信连接，可能被接收者理解为真实运营能力。
- 证据：`miniprogram/pages/discover/index.ts:29-42`；页面内边界位于 `index.wxml:9-18`，不会自动进入分享标题；隔离复现见 `tests/demo-truth-boundaries.test.mjs`。
- 建议：离线 demo 禁止分享，或 title/path/落地页共同明确 `DEMO_ONLY/本地演示`；正式分享必须从可信 runtime evidence 派生。

## P2

### RT-A-P2-01：两份 evidence schema 在 Ajv strict 模式下无法编译

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：foundation/integration
- 复现：`new Ajv2020({strict:true}).compile(schema)` 报 `missing type "array" for keyword "minItems"`。
- 影响：严格验证器/CI 无法采用合同；现有 strict:false 测试掩盖 schema 缺陷。
- 证据：`integration/manifests/schema.json:111-120`、`docs/contracts/execution-evidence.schema.json:79-98`、`tests/contract-drift.test.mjs`。
- 建议：为 minItems 所在子 schema 明确 `type:array` 并增加 strict compile gate。

### RT-A-P2-02：三个云函数复制冻结 Action 列表

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：social-review、city-events、admin
- 复现：对比 canonical registry 与模块本地常量；当前值一致，但编译只能证明成员合法，不能证明完整/同序。
- 影响：下次合同变更可能出现单边漏 action 或漂移。
- 证据：canonical `miniprogram/shared/contracts/action-map.ts:201-229`；复制在 `cloudfunctions/socialApi/index.ts:53-58`、`eventApi/index.ts:62-66`、`adminApi/index.ts:12-16`。
- 建议：像 identity/content 一样直接引用 `CLOUD_ACTIONS_BY_FUNCTION`。

### RT-A-P2-03：DTO/枚举字面量存在多处重复来源

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：foundation/integration、social-review、admin、art/contentApi、cloud-shared
- 复现：对比 mediaType、requestedScope、role、content category 的冻结定义与本地数组；当前值相同。
- 影响：值域变更时容易形成合同漂移。
- 证据：`action-types.ts:258-263,401-419,455-460`、`projections.ts:45-49,160-170,186-196` 及 social/admin/content/_shared 中的复制定义。
- 建议：改用 indexed-access types 与 canonical readonly values；新增单一来源扫描。

### RT-A-P2-04：events 截图 evidence 使用仓库外绝对路径

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：city-events
- 复现：读取 events manifest 的 3 个截图 artifact；路径位于 `E:/Temp/...`，换机或清理后不可复查。
- 影响：证据不可版本化、不可移植，07B 无法稳定复测。
- 证据：`integration/manifests/events.json:62-64,115-117`。
- 建议：原 owner 把证据放入其允许的仓库证据目录，使用 repo-relative path、hash 和 source revision。

### RT-A-P2-05：多个交互控件小于 44px 基线

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：city-events、social-review、foundation UI
- 复现：页面 class 比全局 selector 更具体，覆盖 88rpx token；活动范围按钮为 72rpx、主理人文本按钮 76rpx，social/network 另有 64/72rpx。
- 影响：触控准确性和可访问性下降。
- 证据：`miniprogram/app.wxss:12-16`、`pages/events/index.wxss:1`、`packageEvents/pages/event/index.wxss:1`、`packageSocial/pages/tag-status/index.wxss:6`、`pages/network/index.wxss:8`；隔离测试 `tests/asset-and-client-boundaries.test.mjs`。
- 建议：所有 button/navigator 的最终 computed min-height 不低于 88rpx，并用静态 selector 检查及设备复测。

### RT-A-P2-06：活动页 safe-area 规则可能被 shorthand padding 覆盖

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：city-events client
- 复现：根节点带 `ab-safe-bottom`，但页面本地 `.events-page/.detail-page/...` 设置 `padding: ... 72rpx`；页面样式后加载时可能覆盖全局 `padding-bottom`。
- 影响：iOS home indicator 可能遮挡底部内容。
- 证据：`miniprogram/app.wxss:25-27` 与 events/city/event/enrollment/organizer 的根 wxss/wxml；iOS 设备 gate 为 UNVERIFIED。
- 建议：根 padding 显式使用 `calc(72rpx + env(safe-area-inset-bottom))` 或拆分结构；真机验证后再关闭。

### RT-A-P2-07：活动页缺少弱网超时/恢复状态

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：city-events client
- 复现：对比艺术页 2.5 秒 weak-network timer 与活动页 promise loading；活动页没有超时提示和延迟 fixture。
- 影响：弱网下可能长期停留在模糊 loading，缺少可理解的恢复路径。
- 证据：`miniprogram/packageArt/pages/channel/index.ts:28-35,100-106`；`miniprogram/pages/events/index.ts:300-350`。
- 建议：增加隔离延迟/超时 fixture，验证 weak-network 提示、重试、去重和旧请求覆盖。

### RT-A-P2-08：未来 WECHAT_PAYMENT 配置为可用后仍无法走当前报名路径

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：city-events/eventApi、future payment owner
- 复现：即使 `paymentReady` 的全部 gate 成立，资格逻辑仍要求 registrationMethod 为 INTEREST，WECHAT_PAYMENT 会得到 EVENT_UNAVAILABLE。
- 影响：当前安全禁用，无假 success；但未来误开 feature flag 会出现“能力已配置但业务不可用”的合同死路径。
- 证据：`cloudfunctions/eventApi/index.ts:711-720,821-838,1122-1127`；当前 runtime `paymentCapability='DISABLED'`，未发现 `wx.requestPayment`。
- 建议：在独立订单、回调、退款和幂等合同完成前显式保持 unsupported；不要复用兴趣登记伪造付款成功。

### RT-A-P2-09：全局 reduced-motion selector 缩窄后不再覆盖全部渲染元素

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：foundation UI、city-events、discover/social client
- 复现：检查当前 `@media (prefers-reduced-motion: reduce)`；selector 从通配元素缩窄为 `page, view, button, image`，但页面实际使用 `text`、`navigator`、`picker` 与自定义组件。
- 影响：部分元素或组件的 animation/transition 可能绕过系统减少动态效果偏好；没有设备证据可证明等价覆盖。
- 证据：`miniprogram/app.wxss:61-67` 与 discover/events/network WXML；隔离复现见 `tests/asset-and-client-boundaries.test.mjs`。iOS/Android gate 均为 `UNVERIFIED`。
- 建议：恢复全局覆盖或逐组件建立可机器核验的 reduced-motion 规则，并在开启系统偏好的 iOS/Android 设备复测。

### RT-A-P2-10：Discover 手写第二套 13 城目录

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：foundation/final integration
- 复现：比较 canonical `CITY_DIRECTORY` 与 Discover 源码/新测试；首页手写 featured cities、13 城中文分组，测试再次复制所有名称。
- 影响：当前值恰好一致，但后续城市增删或名称变更可让首页、测试与冻结地理合同静默分叉。
- 证据：`miniprogram/shared/constants/geography.ts:76-90`、`docs/contracts/geography.json`；`miniprogram/pages/discover/index.ts:3-15`、`tests/components/discover/home-page.test.mjs:32-40`；隔离复现见 `tests/contract-drift.test.mjs`。
- 建议：从 `CITY_DIRECTORY` 派生展示与测试，不再维护名称字面量第二来源。

### RT-A-P2-11：Discover 图片失败态与文本链接触控盒缺失

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：foundation/discover UI
- 复现：检查 Discover hero、城市卡、艺术占位图，均无 `binderror` 或本地失败 fallback；“查看活动”文本 navigator 只有 24rpx 字号与 8rpx 底 padding，没有 88rpx min-height。
- 影响：图片解码/路径失败时出现空洞区域；小触控目标降低可用性。弱网、真机读屏与设备触控均未验证。
- 证据：`miniprogram/pages/discover/index.wxml:3,55,60-63,87`、`index.wxss:5`；隔离复现见 `tests/demo-truth-boundaries.test.mjs`。
- 建议：为三类图片增加 binderror + project-owned local fallback；文本链接提供至少 88rpx 触控盒，并在 iOS/Android/弱网与屏幕阅读器复测。

### RT-A-P2-12：DEMO 活动卡只按城市跳转，落地页会替换成另一条活动

- 严重度：`P2`
- 状态：`OPEN`
- 所有者：foundation/discover、art、city-events
- 复现：点击 Discover 的“私人收藏与家族传承对话”或艺术详情的“作品资料阅读会（DEMO_ONLY）”；路由只携带 `demoCityId`，目标页再按城市索引生成另一条 `demo:<cityId>` 标题与主题。
- 影响：虽然仍处于明确 DEMO 边界，没有冒充真实活动，但卡片与详情不是同一记录，用户看到的活动身份、标题和主题会在点击后被替换，现有正式测试也未覆盖该一致性。
- 证据：`miniprogram/pages/discover/index.ts:17-21` 与 `index.wxml:78-82`；`miniprogram/packageArt/data/demo.ts:32`、`packageArt/pages/detail/index.ts:232-241`；`miniprogram/components/ab-event-card/demo-data.ts:1-45`。隔离复现见 `tests/demo-truth-boundaries.test.mjs`。
- 建议：由 city-events owner 提供唯一 DemoEvent registry 和稳定 demoEventId；列表、艺术关联卡与详情必须解析同一记录。若暂不支持同一详情，应禁用跳转并明确是“另一策展示例”。

## 已验证未发现可利用问题的本地边界

| 攻击面 | 本地结论 | 边界 |
|---|---|---|
| 客户端伪造 OPENID/ownerId/role/isAdmin/reviewerId | `PASS_LOCAL` | trusted context + RBAC/ownership 负测通过；真实 CloudBase provider 未验证 |
| IDOR：资料、申请、材料、好友字段、报名、管理案件 | `FAIL_LOCAL` | 结构化记录的多数 owner 负测通过，但头像媒体缺 owner/purpose 绑定（RT-A-P1-09）；生产 adapter/ACL 未验证 |
| 分享 token 枚举、重放、过期、撤销、query PII | `PASS_LOCAL` | token hash/短 scene/过期/撤销/拉黑重算通过；真实 QR、日志和跨模块 invalidation 消费未验证 |
| 删除好友、拉黑、撤销认证后权限回收 | `FAIL_LOCAL` | 服务端局部撤销测试通过，但失败刷新可继续显示 FRIENDS_ONLY 客户端缓存（RT-A-P1-13）；真实跨模块 invalidation 仍未验证 |
| 管理端入口、越权 action、并发审批、审计篡改 | `PASS_LOCAL_EXCEPT_P0-02` | RBAC、expectedVersion、append-only/rollback 测试通过；材料访问链缺失 |
| 报名重复、容量竞争、非法转移、幂等冲突 | `PASS_IN_MEMORY_EXCEPT_P1-02` | 内存事务测试通过；真实 CloudBase 索引/事务未验证 |
| 支付假 success、订单或退款承诺 | `PASS_DISABLED` | 无支付按钮、无 requestPayment、无订单/退款承诺；真实支付 N/A/UNVERIFIED |
| 媒体用途与撤销留存 | `FAIL_LOCAL` | VERIFICATION 材料可进入 REPORT，PHYSICAL 撤销后记录/引用仍在（RT-A-P1-10/11） |
| secret/PII | `PASS_STATIC_WITH_SCOPE` | 未发现 credential 模式；手机号/证件/材料 URL 只出现在明确的合成测试 fixture；二进制、DevTools、设备、CloudBase 日志未验证 |
| 网络基础设施/线上网络安全 | `UNVERIFIED/OUT_OF_SCOPE` | 按用户要求未进行域名、TLS、端口、真实接口或生产渗透检查 |

## 07A 终止条件

`unresolvedP0=4`，`contractDrift.total=8`；当前 foundation validator、typecheck 与静态包体脚本为 exit 0，但完整 `node --test` 仍为 exit 1，card 原 manifest 的必需 local gate也为 FAIL。静态包体不是 Developer Tools 证据，也不清除其他失败。Developer Tools、iOS、Android、真实 CloudBase、网络安全、上传与发布均未验证。因此 `integrationEligible=false`。本轮在此停止，等待原模块负责人处理 proposals 并更新原模块 manifest；不得进入 Prompt 08。
