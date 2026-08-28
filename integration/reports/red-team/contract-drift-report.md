# RED_TEAM_A 合同漂移报告

- 合同基线：`docs/contracts/FROZEN.json`，`contractVersion=1.0.0`
- 范围：foundation 冻结基线与 02–06 五份 feature manifest、Action/DTO、枚举、城市目录和 evidence schema
- 合同值漂移：Action/DTO 映射、状态枚举、canonical 7 国 13 城目录均未发现当前值差异
- 合同结构/阶段所有权/单一来源漂移：`8` 类（P1 4，P2 4），全部 `OPEN`
- 额外证据可移植性问题：1 类 P2，不计入 contract drift 数
- gate：`FAIL`

## Manifest 矩阵

| 模块 | generatedAt | overall | local | 其余 5 个 gate | checks P/F/U | changedPaths |
|---|---|---|---|---|---|---|
| foundation | 2026-08-27T07:36:31.066Z | LOCAL_TEST_PASS | PASS | 全部 UNVERIFIED | 3/0/0 | 缺失 |
| card | 2026-08-27T12:08:47.837Z | INCOMPLETE | FAIL | 全部 UNVERIFIED | 16/4/2 | 缺失 |
| social-review | 2026-08-27T11:51:17.861Z | LOCAL_TEST_PASS | PASS | 全部 UNVERIFIED | 7/0/0 | 缺失 |
| events | 2026-08-27T12:55:11.161Z | LOCAL_TEST_PASS | PASS | 全部 UNVERIFIED | 8/0/2 | 缺失 |
| art | 2026-08-27T11:48:00.000Z | LOCAL_TEST_PASS | PASS | 全部 UNVERIFIED | 13/1/0 | 缺失 |
| admin | 2026-08-27T12:42:41.702Z | BLOCKED | PASS | 全部 UNVERIFIED | 17/2/0 | 缺失 |

六份 manifest 均为 1.0.0，并在现有 Ajv `strict:false` 模式下 schema-valid；没有把本地组件/截图提升为 Developer Tools、真机、上传或 release 证据。它们全部缺少 changedPaths/sourceRevision/结构化执行证据。card 已有必需 `local=FAIL`；foundation 当前 validator 为 337/337 PASS，但这不能清除 card、红队 P0、其他漂移或完整测试命令失败。

最终只读快照中，红队目录外共有 55 个变化路径（48 tracked、7 untracked；tracked diff 48 files / 885 insertions / 507 deletions）。tracked diff 与 untracked 文件 manifest 的规范化 SHA-256 均记录在 `test-summary.json`。完整路径见该文件；六份原 manifest 均未记录这些变化。

## P1 漂移

### CD-P1-01：changedPaths 与结构化 executions 无法表达

- Owner：foundation/integration
- 复现：schema 顶层 `additionalProperties=false`，required/properties 均无 changedPaths；添加后验证失败，不添加则 Prompt 07 的变更范围不可审计。
- 证据：`integration/manifests/schema.json:6-65`；gate evidence 只有 `string[]`（98–113），check evidence 只有 string（158–166）。六份 manifest 均缺字段。
- 影响：无法校验 owner、tracked path、命令/退出码、环境、观察时间、源 revision 和 evidence path。
- 建议：下一合同版本加入 `changedPaths[]` 和 `executions[]`；路径必须 repo-relative、tracked 且符合文件所有权。
- 状态：`OPEN`

### CD-P1-02：phase/overall/gate 约束不是双向的

- Owner：foundation/integration
- 复现：schema 接受 FEATURE_MODULE 低 overall 搭配所有高阶 gate PASS，也接受 FOUNDATION 自报 RELEASED。
- 证据：`integration/manifests/schema.json:67-94`、`docs/contracts/execution-evidence.schema.json:28-67`；`tests/contract-drift.test.mjs` 三个构造均验证为 true。
- 影响：schema-valid evidence 可以越过阶段授权。
- 建议：绑定 phase ceiling 与 overall/gate 双向关系；只有 FINAL_INTEGRATION 可声明高阶 gate PASS。
- 状态：`OPEN`

### CD-P1-03：证据未绑定 source revision，manifest 与当前 tree 冲突

- Owner：foundation/integration、card、events、art、admin
- 复现：旧 manifest 记录全量测试失败、cloud runtime stale、城市 hash mismatch 或旧包体结果；本轮自身又因审计期间出现 `tsconfig.miniprogram.json` 范围外改动而得到 typecheck 先 FAIL 后 PASS 的两个结果，证明未绑定 tree 的 generatedAt 不足以识别证据输入。
- 证据：card `:13,16,212-213`；art `:14`；events `:15`；admin `:158-160`。当前：typecheck exit 0（早先为 exit 1）、validator 337/337（早先为 336/337）、runtime hash `4f54b088...`、最新 package source 855,806/2,097,152 exit 0（本轮先后还出现 2,096,905 PASS、2,134,322 FAIL、734,176 PASS、852,907 PASS 与 854,028 PASS）；built npm 由中间态存在变为最终不存在。package 脚本自身也有 dirty diff，详见 `test-summary.json`。
- 影响：generatedAt 不能证明证据对应哪棵 tree，修复前后结果不可追溯。
- 建议：每次 execution 绑定 commit/tree hash；更新原 manifest 时保留历史失败账本。
- 状态：`OPEN`

### CD-P1-05：未进入 Prompt 08 即完成 foundation-owned Discover 最终组合

- Owner：foundation/final integration
- 复现：冻结所有权要求 `pages/discover/**` 在最终集成前保持 placeholder；当前 Discover 已连接 card、network、events、art，并组合城市、活动和艺术 demo，新增测试还明确断言其“不再是 placeholder”。
- 证据：`AGENTS.md:19`、`docs/contracts/file-ownership.md:15-18`；`miniprogram/pages/discover/index.ts:29-44`、`index.wxml:29-98`；`tests/components/discover/home-page.test.mjs:7-40`。`integration/manifests/` 中没有 `phase=FINAL_INTEGRATION` manifest，art manifest 仍只提出 `MANIFEST_REQUEST`。
- 影响：在 07A 尚有 P0 且未完成 07B 时实质执行 Prompt 08 的组合步骤，阶段顺序、文件所有权和证据链无法成立。
- 建议：由 final-integration owner 撤回/隔离当前 composition；或等待 07B eligible 后通过 Prompt 08、FINAL_INTEGRATION manifest、changedPaths 与 source-bound executions 正式接入。
- 状态：`OPEN`

## P2 漂移

### CD-P2-01：schema 无法 strict compile

- Owner：foundation/integration
- 复现：Ajv 2020 strict=true 编译失败，报 minItems 所在 schema 缺 `type:array`。
- 证据：integration schema `:111-120`、execution schema `:79-98`；现有正式测试显式 strict=false。
- 建议：修正子 schema 并加入 strict compile CI gate。
- 状态：`OPEN`

### CD-P2-02：Action registry 被三个模块复制

- Owner：social-review、events、admin
- 复现：canonical 为 `action-map.ts:201-229`；三模块各维护本地列表。当前 59 action 值一致，但类型检查不能证明函数分组完整/同序。
- 证据：`socialApi/index.ts:53-58`、`eventApi/index.ts:62-66`、`adminApi/index.ts:12-16`。
- 建议：直接引用 `CLOUD_ACTIONS_BY_FUNCTION`，加入禁止 feature Action literal list 的检查。
- 状态：`OPEN`

### CD-P2-03：DTO/enum 字面量存在重复来源

- Owner：foundation/integration、social、admin、art/content、cloud-shared
- 复现：mediaType、requestedScope、roles、content category 在冻结 DTO/projection 之外另有本地数组；新增 hero asset evidence 又使用独立 object shape，并把城市 manifest 的 `LOCAL_FILES_ONLY_NO_HOTLINK` 写成 `LOCAL_FILE_ONLY_NO_HOTLINK`。当前业务枚举值仍一致。
- 证据：canonical `action-types.ts:258-263,401-419,455-460`、`projections.ts:45-49,160-170,186-196`；复制存在于 social/admin/content/_shared；`miniprogram/assets/manifests/cities.json` 与新增 `hero.json:1-24` 没有共同 schema/值源。
- 建议：使用 indexed-access type 与 canonical values，禁止第二来源。
- 状态：`OPEN`

### CD-P2-04：Discover 新增第二套城市目录来源

- Owner：foundation/final integration
- 复现：Discover 源码手写 featured cities 与完整 13 城中文分组，新页面测试又复制 13 个名称；页面没有从 canonical `CITY_DIRECTORY` 派生。
- 证据：canonical `miniprogram/shared/constants/geography.ts:76-90` 与 `docs/contracts/geography.json`；复制位于 `miniprogram/pages/discover/index.ts:3-15`、`tests/components/discover/home-page.test.mjs:32-40`；`AGENTS.md:9` 禁止 fork country/city。
- 影响：当前值仍一致，但后续城市调整可让首页、测试与冻结合同分叉。
- 建议：从 `CITY_DIRECTORY` 派生 featured city/分组，测试比较 canonical 数据而不是复制字面量。
- 状态：`OPEN`

## 不计入漂移数的 P2 evidence 问题

events manifest 的三个截图 artifact 指向仓库外 `E:/Temp/...` 绝对路径（`integration/manifests/events.json:62-64`）。当前机器可能存在，但不可版本化/跨机复现；由 events owner 移入允许的仓库证据目录，并以 repo-relative path、hash、sourceRevision 引用。状态 `OPEN`。

## 当前无值漂移的项目

- 冻结 Action 总数 59，函数分组为 10+17+12+7+13；现有 contract tests 通过。
- ReviewStatus 与状态迁移值一致；withdraw 仍使用 tombstone deletion，没有私自新增状态。
- 地理目录仍为 7 国 13 城，顺序、名称和 IANA timezone 一致。
- Discover 的第二来源当前恰好仍是相同 13 城；这是单一来源漂移，不是当前 canonical 值漂移。
- integration 与 shared gate status 仍只使用 `PASS/FAIL/UNVERIFIED/NOT_APPLICABLE`，未发明新状态枚举。

## 结论

`contractDrift.total=8`，gate=`FAIL`。在 CD-P1-01/02/03/05 与 CD-P2-01/02/03/04 经原 owner 处理并由 07B 复证前，`integrationEligible=false`。
