# 修复请求：幂等记录去 OPENID 化

- 关联问题：`RT-A-P1-01`
- 严重度：`P1`
- 当前状态：`OPEN`
- 负责人：foundation/cloud-shared（主）、social-review、admin、city-events、art/contentApi

## 最小修复建议

统一使用带域 HMAC 或稳定不可逆 principal digest 构造 namespace；禁止 helper 接收名为 openId 的裸值。设置合理 TTL，并安全迁移旧记录，不在日志/错误中输出旧 namespace。

## 验收

- 对各模块写 action 序列化 idempotency store，均不包含原 OPENID。
- replay/conflict/actor 隔离语义保持不变。
- secret/PII 扫描与模块负测通过。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
