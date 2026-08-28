# 修复请求：艺术关联活动真实性门

- 关联问题：`RT-A-P0-04`
- 严重度：`P0`
- 当前状态：`OPEN`
- 负责人：art/contentApi、city-events、foundation/shared-contracts

## 最小修复建议

`content.listRelatedEvents` 对每个投影强制 REAL、HUMAN_REVIEWED、审核证明与 source-version freshness。客户端 model 保留 origin/verification/evidence label，并在 LIVE fail closed；OFFLINE_DEMO 可显示但必须标记 DEMO_ONLY。

## 验收

- 当前 SYNTHETIC + NOT_APPLICABLE fixture 不再进入 LIVE 结果。
- 客户端不能在映射中丢弃证据维度。
- server/client 均有错状态、错城市、stale、合成活动负测。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
