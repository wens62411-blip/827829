# 修复请求：城市素材人工权利发布门

- 关联问题：`RT-A-P1-03`
- 严重度：`P1`
- 当前状态：`OPEN`
- 负责人：city-events/assets、foundation/discover、integration rights reviewer

## 最小修复建议

在构建/发布或运行时要求每项城市/Discover hero 素材为 RIGHTS_APPROVED；未批准时使用项目自有 fallback。保留 source page、author、license、attribution、hash、alt、reviewer 和 reviewedAt，并让页面消费同一 manifest 门禁。

## 验收

- DRAFT/CLAIMED 图片不能进入 release 包或正式页面。
- 13 个城市项和 1 个独立 hero 由人工 reviewer 逐项记录处理结果；hero 与苏黎世城市图共用 source page 时仍分别核对最终改作和使用场景。
- hash/alt/图片失败/credit 测试保持通过，Developer Tools 与设备 gate 独立复测。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
