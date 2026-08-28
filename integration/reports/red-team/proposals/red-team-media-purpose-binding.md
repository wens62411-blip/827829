# 修复请求：验证材料与举报证据必须用途隔离

- 关联问题：`RT-A-P1-10`
- 严重度：`P1`
- 当前状态：`OPEN`
- 负责人：social-review、media

## 最小修复建议

由 social-review/media owner 在 `report.create` 中要求证据资产属于独立的 `REPORT` domain/purpose，并绑定本次 report 草稿或一次性上传授权；禁止复用 `VERIFICATION`、头像或其他私密用途资产。所有读取、留存与删除策略也应按 purpose 分开。

## 验收

- `VERIFICATION` 资产作为 report evidence 时返回冻结的安全错误，且不创建部分举报记录或幂等记录。
- REPORT 上传策略只允许当前 principal 和目标举报使用，过期、跨用户、跨举报与用途重放均失败。
- 重跑 social-review 组件、云函数、隐私和负向测试，并更新原 manifest。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
