# 修复请求：触控、安全区与弱网恢复

- 关联问题：`RT-A-P2-05`、`RT-A-P2-06`、`RT-A-P2-07`、`RT-A-P2-09`、`RT-A-P2-11`
- 严重度：`P2`
- 当前状态：`OPEN`
- 负责人：city-events、social-review、foundation UI

## 最小修复建议

所有交互控件最终高度至少 88rpx；页面根 padding 显式加 safe-area；为活动读取增加弱网提示、超时、重试去重和旧请求防覆盖。恢复覆盖全部可能动画/过渡元素的 reduced-motion 策略，或给每个会运动的组件提供可机器核验的等价关闭规则。Discover 的 hero、城市与艺术图片需有 binderror/local fallback，文本链接也要有完整触控盒。

## 验收

- 静态 selector 测试不再发现小于 88rpx 的 button/navigator。
- iOS/Android 真机验证安全区、键盘与触控。
- 隔离延迟/失败 fixture 验证弱网提示和恢复；设备未测前 gate 保持 UNVERIFIED。
- `text`、`navigator`、`picker`、自定义组件等不因 selector 缩窄而绕过 reduced-motion；用系统偏好在设备上复测。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
