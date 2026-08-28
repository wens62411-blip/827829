# 修复请求：支付能力合同死路径

- 关联问题：`RT-A-P2-08`
- 严重度：`P2`
- 当前状态：`OPEN`
- 负责人：city-events/eventApi、future payment owner

## 最小修复建议

在订单、签名、回调、退款、对账和幂等合同完成前，把 WECHAT_PAYMENT 明确标记为 unsupported 并保持 runtime disabled；未来不要复用 INTEREST action 表示支付成功。

## 验收

- 当前仍无支付按钮、requestPayment、假 order/refund/success。
- feature flag 误开时 fail closed 且文案不作支付承诺。
- 真支付实现另有端到端负测和独立审核后再改变 gate。

原模块负责人处理结果：待填写。

修复 diff / 测试 / manifest 证据：待填写。
