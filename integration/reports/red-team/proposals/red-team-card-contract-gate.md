# 修复请求：清除 card 模块必需合同失败

- 关联问题：`RT-A-P1-07`
- 状态：`OPEN`
- 严重度：`P1`
- 负责人：card、foundation/shared-contracts

## 最小修复建议

由 card 与 shared-contract owner 按原文件所有权处理 card manifest 已列出的 4 个 FAIL 和 2 个 UNVERIFIED 项，不以当前离线 demo、局部组件通过或红队脚本替代模块合同。优先完成 rich profile DTO/visibility、expectedVersion、生产 adapter 与既有负向合同缺口。

## 验收证据

1. 重跑 card 原模块合同、组件、云函数与负向测试，失败仍按 FAIL 记录。
2. 更新 `integration/manifests/card.json` 的原 checks、overall 与 gates；不得由红队代改。
3. 每条执行证据绑定修复 source revision/changedPaths，保留旧失败历史。
4. Developer Tools、真机、真实 CloudBase、上传和发布没有证据时继续 `UNVERIFIED`。
5. 仅在 `RED_TEAM_B` 提供定向复测证据后才能关闭本问题。
