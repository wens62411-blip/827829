# 修复请求：关系撤销后清除 FRIENDS_ONLY 客户端缓存

- 关联问题：`RT-A-P1-13`
- 状态：`OPEN`
- 严重度：`P1`
- 负责人：social-review/network client、social friend UI

## 最小修复建议

把含 FRIENDS_ONLY 字段的页面状态视为短期授权投影，而不是普通展示缓存。network/friend 页面回前台、收到关系 invalidation 或发起刷新时，先使敏感投影不可渲染；只有最新服务端响应再次证明 ACCEPTED 且版本匹配后才能显示。任何超时、异常、对方 remove/block 或身份切换都清空 acceptedPreview、card、claims 与关系权限。

## 验收证据

1. 先加载包含 headline/avatar/biography 的 ACCEPTED 卡片，再模拟对方 remove/block 或刷新失败，敏感字段立即消失。
2. friend 页面具备 onShow/失效重验，不能只依赖首次 onLoad。
3. 缓存绑定 viewer、subject、relationship version 与 projection version，错配或过期 fail closed。
4. 原 owner 更新 social manifest 并重跑关系矩阵、跨设备撤销与负向测试；由 `RED_TEAM_B` 复证后才能关闭。
