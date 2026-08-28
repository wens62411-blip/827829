# Official platform constraints verified on 2026-08-27

This note records platform constraints that changed the foundation configuration. It is not evidence that Developer Tools, a device, CloudBase, upload or release has run.

- WeChat permits 2–5 tab items; tab targets must be declared in the main `pages` list. Phase one uses four card-first tabs (`Card`, `Network`, `Discover`, `Me`); Events and Art remain secondary routes entered from Discover.
- Ordinary subpackages may consume main-package `shared/**`; independent subpackages may not. No AB Club business package is marked independent, and the main package does not import package-internal code.
- The Developer Tools TypeScript compiler removes types but does not perform complete type checking. `npm run typecheck` remains an independent required gate.
- With root `package.json` and `miniprogramRoot: miniprogram/`, npm build needs `packNpmManually` and `packNpmRelationList`; this mapping is present in `project.config.json`.
- No official guarantee for a literal `touristappid` was found. The committed AppID is intentionally empty; an authorized AppID belongs in ignored `project.private.config.json`.
- `wx.cloud.callFunction` returns application data in `transport.result`; platform `requestID` and AB Club's application `requestId` are separate evidence identifiers.
- `tdesign-miniprogram@1.16.0` is pinned exactly and registered only where used. Its distributed Mini Program files are large enough that the 2 MB single-package limit still requires an actual Developer Tools package report.

Primary references:

- [Native TypeScript support](https://developers.weixin.qq.com/miniprogram/dev/devtools/compilets.html)
- [Global app configuration](https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html)
- [Subpackages and size limits](https://developers.weixin.qq.com/miniprogram/dev/framework/subpackages.html)
- [npm support](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)
- [Project configuration](https://developers.weixin.qq.com/miniprogram/dev/devtools/projectconfig.html)
- [wx.cloud.callFunction](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/functions/Cloud.callFunction.html)
- [Cloud.getWXContext](https://developers.weixin.qq.com/miniprogram/dev/wxcloud/reference-sdk-api/utils/Cloud.getWXContext.html)
- [TDesign Mini Program 1.16.0 release](https://github.com/Tencent/tdesign-miniprogram/releases/tag/tdesign-miniprogram%401.16.0)
