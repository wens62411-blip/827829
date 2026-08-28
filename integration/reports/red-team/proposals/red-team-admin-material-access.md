# 修复请求：管理员审核材料访问链

- 关联问题：`RT-A-P0-02`
- 严重度：`P0`
- 当前状态：`OPEN`
- 负责人：admin（主）、foundation/shared-contracts、social-review

## 最小修复建议

增加只读、短期、单 reviewer/单 case/单 material-version 绑定的材料访问授权；服务端记录 append-only access audit。审批命令引用访问审计与材料 hash/version，并在同一事务核验。客户端和日志不得获得长期 URL。

## 验收

- 未读取材料、访问已过期、材料版本变化、访问者与审批者不同均不能 APPROVE。
- 正常审批 ReviewLog 可追溯到访问审计，但公开/普通审计 DTO 不泄露材料 locator。
- `admin-material-access-gap.test.mjs` 的盲审路径转为拒绝。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
