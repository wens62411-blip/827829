# RED_TEAM_A 真实性边界报告

审计基线为 `main@da8d5afda651d3396d26f082e4e24481d68850f4` 加当前既有未提交业务改动，合同版本 `1.0.0`。本报告只判断代码、fixture 和现有证据能支持什么，不把本地测试、静态截图、SYNTHETIC、DEMO_ONLY、AI 输出或声明字段升级为真实运营/人工审核/已发布。

当前工作树在审计期间扩展为红队目录外 55 个变化路径（48 tracked、7 untracked）；红队保持只读且未回退，最终快照与 SHA-256 指纹见 `test-summary.json`。最终 AppID 为空，符合 `LOCAL_ONLY_NO_APPID`，但仍不能证明预览或上传。按用户最新范围，本轮不检查网络基础设施/线上网络安全，相关结论保持 `UNVERIFIED/OUT_OF_SCOPE`。

## 总结

- 当前运行事实：runtime 为 `OFFLINE_DEMO`，AppID 为空，与冻结的 `LOCAL_ONLY_NO_APPID` 一致；该局部边界为 `PASS_STATIC`，不是预览、云函数或上传证据。
- 当前支付事实：`DISABLED`；未发现支付按钮、`wx.requestPayment`、订单或退款成功承诺。
- 当前发布事实：Developer Tools、iOS、Android、真实 CloudBase、dev version upload 和 release 均为 `UNVERIFIED`。
- 城市事实：7 国 13 城是冻结目录，不等于全球已运营；页面默认 node 为 PLANNED，并有明确边界文案。
- 种子事实：活动与艺术 seed 均为 SYNTHETIC/DEMO_ONLY/TEST_ONLY，不构成真实内容或人工审核证据。
- 关键失败：公开内容、公开认证与关联活动缺少不可伪造的人审绑定，产生 4 个 P0。
- `integrationEligible=false`。

## 逐项检查

| 边界 | 仓库声明/数据 | 实际可证明结论 | 状态 |
|---|---|---|---|
| 运行模式 | README、project config、runtime service | runtime 的 OFFLINE_DEMO fail closed；AppID 最终为空并符合 LOCAL_ONLY_NO_APPID，但不是预览、云函数或上传证据 | `PASS_STATIC` |
| REAL / SYNTHETIC | 内容投影同时携带 origin/recordOrigin/evidence label | seed 标注诚实；但 REAL 公开门不要求 HUMAN_REVIEWED/ReviewLog | `FAIL`（RT-A-P0-03） |
| 标签审核 | social 局部 audit helper 要求人审日志与 opt-in | 共享 PublicVerificationClaimProjection/identity/event 消费端不携带或复验该证明 | `FAIL`（RT-A-P0-01） |
| 管理审核 | approve 会生成 ReviewLog | reviewer 没有可审计材料访问合同，仍可审批 | `FAIL`（RT-A-P0-02） |
| 关联活动 | contentApi 读取 PublicEventProjection | SYNTHETIC + NOT_APPLICABLE + PUBLISHED 可进入艺术详情；客户端虽新增 origin 透传，但 LIVE 不拒绝、不显示且仍丢 verificationState | `FAIL`（RT-A-P0-04） |
| 城市目录 | 7 国 13 城、directory ACTIVE | 只证明目录存在；页面明确“入口 ACTIVE 不等于 node LIVE/真实活动” | `PASS_STATIC` |
| 城市运营 | overlay 默认 PLANNED、CONTENT_LIVE_UNVERIFIED | 未发现把全部城市描述成已运营；真实运营、主理人和活动供给未验证 | `UNVERIFIED` |
| 活动 seed / 本地策展卡 | `events-demo.json` 与 `ab-event-card/demo-data.ts` 均为合成演示 | 新增 13 城本地策展卡明确 DEMO_ONLY、未排期、报名未开放、支付禁用；没有 APPROVED/LIVE，也不能作为真实供给证据 | `PASS_STATIC` |
| 艺术 seed | `art-demo.json` 为 fixture-only/OFFLINE_DEMO/SYNTHETIC | 本地演示可用；不是真品、鉴定、购买或人工权利证据 | `PASS_STATIC` |
| 人物/机构 | content creator DTO 有来源字段 | 公开 creator 同样没有 ReviewLog 强制绑定，纳入 RT-A-P0-03 | `FAIL` |
| 支付 | runtime DISABLED，event capability fail closed | 无假 success、按钮、订单、退款承诺；真实支付未实现/未验证 | `PASS_DISABLED` |
| 发布 | 默认 cloud main 为 NOT_IMPLEMENTED | 生产 adapter 不存在；本地注入式测试不得解释为已部署 | `UNVERIFIED` |
| 网络安全 | 用户明确排除本轮网络安全检查 | 未探测域名、TLS、端口、线上接口或生产环境 | `UNVERIFIED/OUT_OF_SCOPE` |
| 离线名片 demo | 合成名片与本页草稿 | 显式 SYNTHETIC/DEMO_ONLY，不创建身份、token、认证或保存成功；不等于真实会员 | `PASS_STATIC` |
| 人脉推荐模式隔离 | 三张虚构推荐卡 | OFFLINE_DEMO 内边界诚实；当前非 DEMO/no-cloud 分支会清空合成卡，没有复现来源混淆 | `PASS_STATIC` |
| Discover 分享 | 页面内有 OFFLINE_DEMO 说明 | 分享标题脱离页面说明后无 DEMO 限定，宣称全球可信连接 | `FAIL`（RT-A-P1-14） |
| DEMO 活动身份 | Discover/艺术卡片按 cityId 跳转 | 目标页按城市重新生成另一条标题/主题，卡片与详情不是同一活动 | `FAIL`（RT-A-P2-12） |

## REAL / SYNTHETIC 传播检查

### 正确边界

- `database/seeds/events-demo.json` 和 `database/seeds/art-demo.json` 顶层均明确 fixture/test-only。
- 新增 `miniprogram/components/ab-event-card/demo-data.ts` 为每个冻结城市生成 `demo:<cityId>`，文案明确未排期；详情 `canRegisterInterest=false`，支付仍 DISABLED。
- 新增离线名片写操作显示“未保存/未提交”，没有把 toast 或页面状态写成服务端成功；人脉推荐只在 OFFLINE_DEMO 分支正确显示合成提示。
- 艺术演示内容使用 `recordOrigin=SYNTHETIC` 与 `evidenceScope/evidenceLabel=DEMO_ONLY`。
- 城市页面显示目录与运营的不同状态；没有把目录覆盖解释为真实节点覆盖。
- 默认 cloud entrypoints 返回 `NOT_IMPLEMENTED`，没有伪造成功。

### 失败边界

1. `contentApi` 的 `isPublicCandidate` 只有 PUBLISHED 与 publicVisible 两个条件；把 fixture 的 origin 改成 REAL 后，即使 verificationState 仍为 NOT_APPLICABLE，也能公开。
2. `content.listRelatedEvents` 对 event 只检查 readable 和 PUBLISHED；艺术 view model 当前保留 origin，但仍丢 verificationState，origin 只用于 OFFLINE_DEMO 路由，LIVE 不拒绝也不向用户显示。
3. PublicVerificationClaimProjection 没有 ReviewLog、用户 opt-in 或审核 source-version 字段；下游只能相信容易被种子/adapter 伪造的状态字面量。
4. admin 审批输出可生成看似完整的 ReviewLog，但当前 reviewer API 无法证明人实际访问过材料。
5. Discover 固定为 OFFLINE_DEMO，而分享标题没有 DEMO/合成限定；分享上下文无法继承页内免责声明。
6. Discover 与艺术卡片只传 demoCityId，目标详情重新按城市生成另一条活动，导致 DEMO 活动身份在点击后变化。

## 审核状态检查

- social 模块内部的 `auditPublicVerificationClaim` 对 ReviewLog、reviewer、scope、时间、catalog、用户公开 opt-in 与高风险双审有较强局部防线。
- 此防线没有冻结进跨模块公共 DTO，identity/event/content 消费方不能验证其成立。
- AI/OCR 在现有 social/admin 测试中是 advisory-only，不能自动通过；该局部边界为 `PASS_LOCAL`。
- 任意 `APPROVED/HUMAN_REVIEWED` 数据若要公开，都必须在消费者边界重新验证审核证明；当前未做到。

## 城市与运营真实性

- 冻结地理合同仍是 7 国 13 城，名称、顺序和时区测试通过。
- 城市页 `directory ACTIVE` 与 `nodeOperationalLabel` 分开；默认 overlay 为 PLANNED，文案明确不等于 LIVE。
- 没有真实运营团队、主理人审批、CloudBase 公开数据或线下活动证据。
- 因此可表述为“目录已配置、本地演示可浏览”，不得表述为“全球 13 城已运营”。

## 支付真实性

- `miniprogram/shared/services/runtime.ts` 为 `paymentCapability: 'DISABLED'`。
- eventApi 只有全部支付配置 gate 满足时才报告能力；任一缺失均返回禁用。
- 客户端显示“兴趣登记”，明确不是订单/支付承诺；未发现可执行 `wx.requestPayment`。
- 当前结论是 `PASS_DISABLED`，不是支付链路通过。订单创建、支付回调、签名校验、退款、对账与真实幂等全部 `UNVERIFIED/NOT_IMPLEMENTED`。
- 未来支付即使配置 ready，当前 eligibility 仍拒绝 WECHAT_PAYMENT，记录为 RT-A-P2-08；在独立合同完成前不得开启。

## 发布与设备边界

- `miniprogram-simulate` 仅能证明组件行为；本轮现有测试有 6 项因缺 jsdom 而 SKIP，不能声明页面 E2E。
- 最终 built npm 不存在；最新脚本按 source/已注册依赖估算为 855,806 / 2,097,152 bytes 并 exit 0。审计中间曾观察到 1,490,789 bytes 的物理 `miniprogram_npm`，随后被业务侧移除，也出现过 2,134,322 的失败结果；因此任何静态口径都必须绑定 dirty-tree，且都不是 Developer Tools 权威包体证据。
- `npm run typecheck` 在审计期间由 exit 1 变为最终 exit 0；foundation validator 也由 336/337 变为最终 337/337。即便当前两项通过，空 AppID 与本地校验也不能把它提升为预览/上传证据。
- 没有微信开发者工具、iOS/Android 真机或真实 CloudBase 环境，以下必须保持 `UNVERIFIED`：

  - `gates.devtoolsPreview`
  - `gates.iosDevice`
  - `gates.androidDevice`
  - 真实 CloudBase/ACL/事务/索引/日志
  - `gates.devVersionUpload`
  - `gates.release`

- 按用户要求，本轮也未执行域名、TLS、端口、线上 API 或生产环境探测；这些不是已通过项。

## 结论

真实性 gate 为 `FAIL`。`unresolvedP0=4`，不得将当前仓库描述为人工审核完备、真实内容可发布、全球节点已运营、支付已接通、网络安全已验证或已部署。07A 在此停止，等待原模块 owner 修复并提供更新后的 manifest 与可复测证据。
