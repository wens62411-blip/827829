# 修复请求：manifest evidence 合同

- 关联问题：`RT-A-P1-04`、`RT-A-P1-05`、`RT-A-P2-01`
- 严重度：最高 `P1`
- 当前状态：`OPEN`
- 负责人：foundation/integration

## 最小修复建议

下一合同版本增加 changedPaths 与结构化 executions；绑定 phase/overall/gate 双向规则；修正 minItems 子 schema 的 array type，并以 Ajv strict 模式编译。

## 验收

- changedPaths 必须 repo-relative、tracked、owner-compliant。
- FEATURE_MODULE 不能声明高阶 gate PASS，FOUNDATION 不能自报 RELEASED。
- 三个非法组合负测失败，strict compile 成功。
- 02–06 原 manifest 迁移且保留历史 ledger。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
