# 修复请求：头像媒体必须绑定所有者与用途

- 关联问题：`RT-A-P1-09`
- 严重度：`P1`
- 当前状态：`OPEN`
- 负责人：identity/card、media

## 最小修复建议

由 identity/media owner 扩展媒体读取合同，使头像写入与投影刷新均在服务端校验 `mediaAsset.ownerUserId === principal.userId`、头像用途/域、已完成上传、批准状态和未撤销状态；不要仅凭可猜测的 asset id 查公开 URL。查询接口至少接收 owner 与 purpose，或返回完整的不可伪造媒体授权投影。

## 验收

- 其他用户所有的 asset id、验证材料、举报材料和未批准媒体均被拒绝，且不泄露资产是否存在。
- `profile.updateMine` 与 `card.refreshProjection` 两条路径都 fail closed。
- 增加生产 adapter 负测，并重跑 identity/card 合同、隐私和分享撤销测试。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
