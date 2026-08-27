# AB Club 微信小程序基础仓库

这是供多个 Codex 功能任务安全并行的原生微信小程序骨架。它冻结共享合同、路由、模块边界、集合所有权与执行证据，但不实现名片、好友、活动、艺术或审核业务。

## 当前证据状态

- 环境：`LOCAL_ONLY`
- AppID：空（`LOCAL_ONLY_NO_APPID`；不代表可预览或上传）
- 默认 runtime：`OFFLINE_DEMO`
- 真实支付：`DISABLED`
- 生产部署、CloudBase 环境、开发者工具预览、真机、上传、发布：`UNVERIFIED`

应用不会在云调用失败时静默回退到假数据。占位页只显示“模块待接入”和明确的运行证据标签。

## 本地验证

本仓库的验证脚本要求 Node.js `>=24.0.0`；这是为了使用稳定名称的单进程测试隔离开关，并让受限环境中的测试不依赖派生子进程。客户端 TypeScript 运行时测试由锁定版本的 `tsc` 编译到被忽略的 `.tmp/test-runtime/`，不依赖 Node 的实验性 TypeScript API。

```powershell
npm ci
npm run build
```

`npm run build` 依次执行小程序与云端 TypeScript 检查、合同/路由/manifest 校验、Node 测试和静态包体预算检查。微信开发者工具的“构建 npm”与预览仍需在获得真实 AppID 后人工执行，不能由上述命令替代。根目录依赖通过 `packNpmManually` 映射进 `miniprogram/`，但这项配置仍需开发者工具实测。

云函数以 `.ts` 为唯一实现源；提交的 `.js` 是 `npm run build:cloud-runtime` 生成的自包含 CommonJS bundle。`npm run build` 会校验 bundle 内的源文件 SHA-256，防止类型检查的源码与实际执行文件漂移。修改 `cloudfunctions/**/*.ts` 或云端使用的共享合同时，必须先重新生成 bundle。

## 并行入口

- 决策锁：`DECISION_LOCK.md`
- 文件所有权：`docs/contracts/file-ownership.md`
- 冻结版本：`docs/contracts/FROZEN.json`
- Action 合同：`docs/contracts/actions/`
- 集成证据：`integration/manifests/foundation.json`

任何功能任务先读取全部 `AGENTS.md`、本 README、决策锁、文件所有权和冻结合同；功能任务不得修改 `app.json` 或 `miniprogram/shared/**`。
