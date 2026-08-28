# 修复请求：报名与审计唯一标识

- 关联问题：`RT-A-P1-02`
- 严重度：`P1`
- 当前状态：`OPEN`
- 负责人：city-events/eventApi、foundation/audit

## 最小修复建议

报名 `_id` 使用带域 hash 或服务端随机 id，并对 `(eventId,userId)` 建真实唯一复合索引；审计使用 append-only 随机 id 或 hash(action+principal+request)。不得通过 slice 截断复合标识。

## 验收

- 最大合法 eventId 下两个不同用户不会碰撞。
- 同 requestId 跨 action/actor 不会覆盖审计。
- 真实 adapter 的唯一索引、并发和回滚测试通过。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
