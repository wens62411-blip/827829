import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

test('Me page uses a direct profile hierarchy instead of a second full header', () => {
  const template = read('miniprogram/pages/me/index.wxml');

  assert.doesNotMatch(template, /<ab-brand-header\b/);
  assert.match(template, /class="me-profile"/);
  assert.doesNotMatch(template, /<ab-profile-card\b/);
  assert.doesNotMatch(template, /PRIVATE DESK|我的名片中心/);

  for (const label of ['支持的城市清单', '公开标签状态']) {
    assert.match(template, new RegExp(label), `“我的”页缺少层级入口：${label}`);
  }
  assert.match(template, /class="me-profile__edit"[^>]*url="\/packageCard\/pages\/edit\/index"/);
  assert.doesNotMatch(template, /class="me-link-row"[^>]*url="\/pages\/card\/index"/);
  assert.doesNotMatch(template, /联系我 · 预览、编辑与分享|ui-card\.png/);
  assert.doesNotMatch(template, /收到的名片请求|我的人脉|\/pages\/network\/index/);
  assert.doesNotMatch(template, /管理个人资料、数字名片与所在城市入口/);
  assert.doesNotMatch(template, /资料与名片/);
});

test('Me city group reuses shipped city photography and keeps operations-pending truth', () => {
  const template = read('miniprogram/pages/me/index.wxml');
  const source = read('miniprogram/pages/me/index.ts');
  const styles = read('miniprogram/pages/me/index.wxss');

  assert.match(template, /src="\{\{cityImageSrc\}\}"/);
  assert.match(template, /binderror="handleCityImageError"/);
  assert.match(source, /cityImageSrc:\s*`\/assets\/cities\/\$\{city\.id\}\.jpg`/);
  assert.match(template, /逐步开放/);
  assert.match(template, /节点开放状态以后续公告为准/);
  assert.doesNotMatch(template, /示例城市|城市目录为本地演示/);
  assert.doesNotMatch(template, /申请成功|加入成功|城市群[^<\n]{0,20}\bLIVE\b/);
  assert.match(source, /supportedCityNames\s*=\s*CITY_DIRECTORY\.map/);
  assert.match(template, /wx:for="\{\{supportedCityNames\}\}"[\s\S]*?class="me-city-group__city-token"/);
  assert.match(styles, /\.me-city-group__city-token\s*\{[^}]*display:\s*inline-block;[^}]*white-space:\s*nowrap;/);
});

test('Me only materializes a user-owned local profile and does not revive the synthetic draft', () => {
  const source = read('miniprogram/pages/me/index.ts');

  assert.match(source, /materializeLocalIdentityProfile/);
  assert.doesNotMatch(source, /readOfflineDemoDraft|\.\.\.OFFLINE_DEMO_PROFILE/);
  assert.match(source, /profile:\s*null/);
  assert.match(source, /\.\.\.resolveCityGroup\(profile\)/);
  assert.match(source, /localIdentityCompletion\(local\)/);
  assert.doesNotMatch(source, /completionPercent:\s*100/);
});

test('Me removes repeated demo copy while retaining a concise local-only boundary', () => {
  const template = read('miniprogram/pages/me/index.wxml');

  assert.doesNotMatch(template, /体验版|DEMO_ONLY|示例内容|这是示例名片/);
  assert.match(template, /先建立你的名片/);
  assert.match(template, /仅保存在本机|尚未建立云端账户/);
});

test('Me keeps the top profile panel for first-time creation and removes the duplicate My Card row', () => {
  const template = read('miniprogram/pages/me/index.wxml');
  const profileIndex = template.indexOf('class="me-profile"');
  const registerIndex = template.indexOf('url="/packageCard/pages/edit/index?register=1"');
  const cityIndex = template.indexOf('class="me-city-group"');
  const settingsIndex = template.indexOf('class="me-section-heading"');

  assert.ok(profileIndex >= 0);
  assert.ok(registerIndex > profileIndex);
  assert.ok(registerIndex < cityIndex);
  assert.ok(registerIndex < settingsIndex);
  assert.doesNotMatch(template, /class="me-register-cta"/);
  assert.doesNotMatch(template, /class="me-link-row"[^>]*url="\/pages\/card\/index"/);
});

test('Me page keeps accessible touch targets, dark mode, and reduced-motion treatment', () => {
  const styles = read('miniprogram/pages/me/index.wxss');

  assert.match(styles, /\.me-profile__edit\s*\{[\s\S]*?min-height:\s*(?:8[8-9]|9\d|[1-9]\d{2,})rpx/);
  assert.match(styles, /\.me-link-row\s*\{[\s\S]*?min-height:\s*(?:8[8-9]|9\d|[1-9]\d{2,})rpx/);
  assert.match(styles, /\.me-city-group__action\s*\{[\s\S]*?min-height:\s*(?:8[8-9]|9\d|[1-9]\d{2,})rpx/);
  assert.match(styles, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
