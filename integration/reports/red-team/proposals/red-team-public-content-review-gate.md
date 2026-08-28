# 修复请求：REAL 公开内容人审门

- 关联问题：`RT-A-P0-03`
- 严重度：`P0`
- 当前状态：`OPEN`
- 负责人：art/contentApi（主）、admin/content-review、foundation/shared-contracts

## 最小修复建议

REAL 内容与 creator 的公开读模型必须绑定成功的人审日志、审核范围、内容与媒体 hash、来源版本和权利审批；只接受 HUMAN_REVIEWED。SYNTHETIC 仅允许 OFFLINE_DEMO/DEMO_ONLY 路径并明确标识。

## 验收

- REAL + NOT_APPLICABLE/AI-only/缺 ReviewLog/错 hash/撤销日志全部不公开。
- PUBLISHED/publicVisible 字段本身不能解锁内容。
- 现有正向 fixture 分成显式 demo 与经完整审核链的 public fixture。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
