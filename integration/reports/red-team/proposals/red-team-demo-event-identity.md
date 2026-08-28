# 修复请求：统一 DEMO 活动身份与路由

- 关联问题：`RT-A-P2-12`
- 状态：`OPEN`
- 严重度：`P2`
- 负责人：foundation/discover、art、city-events

## 最小修复建议

建立一份由 city-events owner 维护的单一 `DemoEvent` registry，为每条演示活动提供稳定的 `demoEventId`、cityId、title、theme 与详情字段。Discover、艺术关联活动和目标详情页必须解析同一条记录；不要只传 cityId 后重新生成另一条活动。若短期不接详情，则禁用跳转并明确文案为“查看该城市另一策展示例”。

## 验收证据

1. 列表/艺术卡片的 event id、title、cityId 与目标详情逐字段一致。
2. 非法、过期或未知 demoEventId fail closed，不回退到任意城市模板。
3. OFFLINE_DEMO 边界保持可见，不产生真实排期、报名、主理人、支付或成功承诺。
4. 原 owner 更新模块 manifest，并在 `RED_TEAM_B` 提供定向复测证据；仅有代码或测试文件存在不能关闭问题。
