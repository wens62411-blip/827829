import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');
const app = JSON.parse(read('miniprogram/app.json'));

function actionMarkup(source) {
  return [...source.matchAll(/<(?:button|navigator)\b[\s\S]*?<\/(?:button|navigator)>/g)]
    .map((match) => match[0])
    .join('\n');
}

function registeredRoutes() {
  const routes = [...app.pages];
  for (const subpackage of app.subpackages ?? []) {
    for (const page of subpackage.pages ?? []) routes.push(`${subpackage.root}/${page}`);
  }
  return routes;
}

test('phase-one navigation opens on Discover and exposes only activity and Me beside it', () => {
  const tabs = app.tabBar?.list ?? [];
  const errors = [];
  const expectedPaths = [
    'pages/discover/index',
    'pages/events/index',
    'pages/me/index',
  ];
  const expectedLabels = ['发现', '活动', '我的'];
  if (app.entryPagePath !== 'pages/discover/index') errors.push('冷启动没有直接进入发现品牌首页');
  if (JSON.stringify(tabs.map((item) => item.pagePath)) !== JSON.stringify(expectedPaths)) {
    errors.push(`一级导航路径不符：${tabs.map((item) => item.pagePath).join(' / ')}`);
  }
  if (JSON.stringify(tabs.map((item) => item.text)) !== JSON.stringify(expectedLabels)) {
    errors.push(`一级导航文案不符：${tabs.map((item) => item.text).join(' / ')}`);
  }
  if (tabs.some((item) => item.pagePath === 'pages/network/index' || item.text === '人脉')) {
    errors.push('人脉仍被暴露为一级导航');
  }
  if (tabs.some((item) => /art|merchant|shop/i.test(`${item.pagePath} ${item.text}`))) {
    errors.push('艺术/商户不应成为一期主导航');
  }

  for (const [page, rule] of Object.entries(app.preloadRule ?? {})) {
    const heavy = (rule.packages ?? []).filter((name) => /^(?:art|events|admin)$/i.test(name));
    if (heavy.length) errors.push(`${page} 仍预加载非核心分包：${heavy.join(', ')}`);
  }

  const discover = read('miniprogram/pages/discover/index.wxml');
  if (/url="\/(?:pages\/card|packageCard\/pages\/(?:edit|view|share))\//.test(discover)) {
    errors.push('发现首页仍绕过“我的”直接进入名片管理');
  }
  if (!/创建、查看和分享名片统一在「我的」中管理/.test(discover)) errors.push('发现页没有说明名片入口位于“我的”');
  if (/<ab-profile-card\b/.test(discover)) errors.push('发现首页仍直接展示完整个人名片');
  if (app.pages.includes('pages/bootstrap/index')) errors.push('启动注册/介绍中转页仍被注册');

  assert.deepEqual(errors, []);
});

test('phase-one card journey exposes create, display, live preview, share, and add-friend', () => {
  const routes = new Set(registeredRoutes());
  const requiredRoutes = [
    'pages/card/index',
    'packageCard/pages/edit/index',
    'packageCard/pages/view/index',
    'packageCard/pages/share/index',
    'packageSocial/pages/friend/index',
    'packageSocial/pages/requests/index',
  ];
  assert.deepEqual(requiredRoutes.filter((route) => !routes.has(route)), [], '一期核心路径缺失');

  const editTemplate = read('miniprogram/packageCard/pages/edit/index.wxml');
  const editSource = read('miniprogram/packageCard/pages/edit/index.ts');
  const directPreview = /class="[^"]*(?:card-live-preview|card-preview)[^"]*"/i.test(editTemplate)
    && ['displayName', 'biography'].every((field) => new RegExp(`\\{\\{${field}\\}\\}`).test(editTemplate));
  const profileCardPreview = /<ab-profile-card\b[\s\S]*?card="\{\{previewCard\}\}"/.test(editTemplate)
    && /previewCard/.test(editSource);
  assert.ok(
    directPreview || profileCardPreview,
    '编辑页需要绑定昵称/简介等草稿字段的可见实时名片预览，不能只有表单或头像局部预览',
  );

  const ownerCard = read('miniprogram/pages/card/index.wxml');
  const publicCard = read('miniprogram/packageCard/pages/view/index.wxml');
  assert.match(`${ownerCard}\n${publicCard}`, /分享名片|安全分享|分享与撤销/, '名片展示必须有直接分享入口');

  const profileCard = read('miniprogram/components/ab-profile-card/index.wxml');
  const strangerSurface = `${publicCard}\n${profileCard}`;
  assert.match(
    strangerSurface,
    /申请认识|添加好友|加为好友|ab-friend-request|friend-request/i,
    '查看他人名片时必须能发起 AB Club 好友申请',
  );
});

test('identity bootstrap is deferred until the user deliberately enters card creation', () => {
  const appSource = read('miniprogram/app.ts');
  const discover = read('miniprogram/pages/discover/index.wxml');
  const me = read('miniprogram/pages/me/index.wxml');
  const editor = read('miniprogram/packageCard/pages/edit/index.ts');

  assert.doesNotMatch(appSource, /bootstrapIdentity\s*\(/, '冷启动不应自动建立身份');
  assert.doesNotMatch(discover, /url="\/(?:pages\/card|packageCard\/pages\/(?:edit|view|share))\//);
  assert.match(me, /<navigator\b[^>]*url="\/packageCard\/pages\/edit\/index"/);
  assert.match(editor, /bootstrapIdentity/);
  assert.match(
    editor,
    /getMyProfile\(\)[\s\S]*?AUTH_REQUIRED[\s\S]*?SESSION_EXPIRED[\s\S]*?bootstrapIdentity\(\)[\s\S]*?getMyProfile\(\)/,
    '用户进入编辑页后，首次身份缺失应延迟初始化并重新读取资料',
  );
});

test('network overview is reachable only as a quiet secondary entry from Discover', () => {
  const discover = read('miniprogram/pages/discover/index.wxml');
  const network = read('miniprogram/pages/network/index.wxml');
  const ownerCard = read('miniprogram/pages/card/index.wxml');
  const me = read('miniprogram/pages/me/index.wxml');
  const visitor = read('miniprogram/packageCard/pages/view/index.wxml');

  assert.equal((discover.match(/url="\/pages\/network\/index"/g) ?? []).length, 1);
  assert.match(discover, /discover-text-link--quiet[^>]*url="\/pages\/network\/index"/);
  assert.match(network, /open-type="switchTab"[^>]*url="\/pages\/me\/index"/);
  assert.doesNotMatch(network, /url="\/pages\/card\/index"/);
  for (const [name, template] of Object.entries({ ownerCard, me, visitor })) {
    assert.doesNotMatch(template, /url="\/pages\/network\/index"/, `${name} 不应再暴露人脉总页入口`);
  }
  assert.match(visitor, /\/packageSocial\/pages\/friend\/index\?ownerUserId=/);
});

test('profile review is optional and does not occupy the core card flow', () => {
  const coreTemplates = [
    'miniprogram/pages/card/index.wxml',
    'miniprogram/pages/me/index.wxml',
    'miniprogram/packageCard/pages/edit/index.wxml',
    'miniprogram/packageCard/pages/view/index.wxml',
    'miniprogram/packageCard/pages/share/index.wxml',
  ];
  const errors = [];

  for (const path of coreTemplates) {
    const source = read(path);
    if (/HUMAN REVIEW|REVIEW DESK|card-panel--wine|card-review-item/.test(source)) {
      errors.push(`${path} 把审核台/审核流程放进了核心名片界面`);
    }
    const actions = actionMarkup(source);
    if (/提交审核|开始认证|身份认证|实名认证|认证后(?:创建|展示|分享)|审核后(?:创建|展示|分享)/.test(actions)) {
      errors.push(`${path} 把审核或认证做成了核心动作前置条件`);
    }
  }

  assert.deepEqual(errors, []);
});

test('stage-two and stage-three capabilities are absent from registered phase-one UI', () => {
  const errors = [];
  const forbiddenRoute = /(?:^|\/)(?:enrollment|registration|payment|checkout|trade|trading|merchant|matchmaking|certification)(?:\/|$)/i;
  for (const route of registeredRoutes()) {
    if (forbiddenRoute.test(route)) errors.push(`一期仍注册了后续阶段路由：${route}`);
  }

  const mainTemplates = [
    'miniprogram/pages/discover/index.wxml',
    'miniprogram/pages/card/index.wxml',
    'miniprogram/pages/network/index.wxml',
    'miniprogram/pages/me/index.wxml',
    'miniprogram/pages/events/index.wxml',
    'miniprogram/packageCard/pages/edit/index.wxml',
    'miniprogram/packageCard/pages/view/index.wxml',
    'miniprogram/packageCard/pages/share/index.wxml',
  ];
  const forbiddenAction = /(?:立即支付|去支付|购买|下单|交易撮合|撮合服务|商户入驻|成为商户|活动报名|立即报名|提交报名|实名认证|身份认证|婚恋配对)/;
  for (const path of mainTemplates) {
    const actions = actionMarkup(read(path));
    if (forbiddenAction.test(actions)) errors.push(`${path} 暴露了二/三阶段主动作`);
  }

  assert.deepEqual(errors, []);
});
