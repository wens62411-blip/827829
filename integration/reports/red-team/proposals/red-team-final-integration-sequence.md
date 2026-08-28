# 修复请求：恢复最终集成阶段与文件所有权边界

- 关联问题：`RT-A-P1-12`、`CD-P1-05`
- 严重度：`P1`
- 当前状态：`OPEN`
- 负责人：foundation/final integration

## 最小修复建议

按冻结文件所有权恢复 `pages/discover/**` 的 foundation placeholder/隔离状态；只有在 07B 给出 `integrationEligible=true` 后，才由 Prompt 08 的 final-integration owner 组合 card、social、events、art 等入口。若当前完整 demo 首页确需保留，应先通过正式阶段变更，提供 FINAL_INTEGRATION manifest、结构化 changedPaths、source revision 和全部必需 gate 证据。

## 验收

- RED_TEAM_A/未通过 07B 时不存在未经授权的最终组合入口。
- 最终集成发生时有 `phase=FINAL_INTEGRATION` 的 manifest、完整 changedPaths 与 source-bound executions。
- 02–07 owner 的业务文件无越权修改；合同、组件、云函数、负向测试及设备/发布 gate 按证据如实标记。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
