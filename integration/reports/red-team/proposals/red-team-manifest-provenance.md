# 修复请求：manifest 源版本与证据可移植性

- 关联问题：`RT-A-P1-06`、`RT-A-P2-04`
- 严重度：最高 `P1`
- 当前状态：`OPEN`
- 负责人：foundation/integration、card、events、art、admin

## 最小修复建议

每条执行证据绑定 commit/tree hash、环境、命令、退出码、观察时间和 repo-relative evidence path。模块 owner 重跑后更新原 manifest；events 把仓库外截图移入允许的证据目录。

## 验收

- card/art/events/admin 的过期 runtime/hash/package 文字与当前证据一致。
- 不再出现仓库外绝对 artifact 路径。
- 07B 可从 manifest 唯一还原被测 revision 与证据 hash。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
