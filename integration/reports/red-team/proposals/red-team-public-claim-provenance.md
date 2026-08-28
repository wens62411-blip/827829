# 修复请求：公开认证审核来源绑定

- 关联问题：`RT-A-P0-01`
- 严重度：`P0`
- 当前状态：`OPEN`
- 负责人：foundation/shared-contracts（主）、social-review、card、city-events

## 最小修复建议

在下一合同版本为 PublicVerificationClaimProjection 增加不可伪造的审核证明引用：ReviewLog id/version/hash、reviewedBy/reviewedAt/reviewScope、source aggregate/version、用户 public opt-in version。social 只能从已校验链路创建该投影；card 与 event 消费端必须复验绑定、有效期、撤销与 freshness，缺一即 fail closed。

## 验收

- 红队 `approval-provenance-bypass.test.mjs` 在无 ReviewLog fixture 上转为拒绝。
- 无日志、错 subject、错 scope、AI-only、撤销、过期、无 opt-in 均有负测。
- 原模块合同、云函数、组件和 manifest 已更新并绑定 source revision。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
