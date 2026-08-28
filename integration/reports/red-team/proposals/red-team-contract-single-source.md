# 修复请求：Action/DTO/枚举单一来源

- 关联问题：`RT-A-P2-02`、`RT-A-P2-03`、`RT-A-P2-10`、`CD-P2-04`
- 严重度：`P2`
- 当前状态：`OPEN`
- 负责人：foundation/integration、social、admin、events、art/content、cloud-shared

## 最小修复建议

模块直接引用 `CLOUD_ACTIONS_BY_FUNCTION`、`CITY_DIRECTORY` 与冻结 value/type；使用 indexed-access types，删除本地第二套字面量数组/城市名称清单，但不改变 1.0.0 的值。

## 验收

- 59 action 和所有枚举值保持不变。
- 单一来源扫描无 feature Action literal list 或重复 frozen enum set。
- Discover 的城市展示和测试从 canonical geography 派生，不再手写 13 城名称。
- contracts/typecheck/模块负测通过。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
