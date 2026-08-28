import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

test('Me page uses the restrained personal-space hierarchy instead of a second full card', () => {
  const template = read('miniprogram/pages/me/index.wxml');

  assert.match(template, /<ab-brand-header\b[\s\S]*?eyebrow="PERSONAL SPACE"[\s\S]*?title="我的"/);
  assert.match(template, /class="me-profile"/);
  assert.doesNotMatch(template, /<ab-profile-card\b/);
  assert.doesNotMatch(template, /PRIVATE DESK|我的名片中心/);

  for (const label of [
    '我的数字名片',
    '资料与设置',
    '公开标签状态',
  ]) {
    assert.match(template, new RegExp(label), `“我的”页缺少层级入口：${label}`);
  }
  assert.doesNotMatch(template, /收到的名片请求|我的人脉|\/pages\/network\/index/);
  assert.match(template, /管理个人资料、数字名片与所在城市入口/);
});

test('Me city group reuses shipped city photography and keeps operations-pending truth', () => {
  const template = read('miniprogram/pages/me/index.wxml');
  const source = read('miniprogram/pages/me/index.ts');

  assert.match(template, /src="\{\{cityImageSrc\}\}"/);
  assert.match(template, /binderror="handleCityImageError"/);
  assert.match(source, /cityImageSrc:\s*`\/assets\/cities\/\$\{city\.id\}\.jpg`/);
  assert.match(template, /待运营确认/);
  assert.match(template, /申请不会真实提交/);
  assert.doesNotMatch(template, /申请成功|加入成功|城市群[^<\n]{0,20}\bLIVE\b/);
});

test('Me refreshes its offline profile and city from the saved card draft', () => {
  const source = read('miniprogram/pages/me/index.ts');

  assert.match(source, /import \{ readOfflineDemoDraft \}/);
  assert.match(source, /const draft = readOfflineDemoDraft\(\)/);
  assert.match(source, /displayName:\s*draft\.displayName/);
  assert.match(source, /cityId:\s*draft\.cityId/);
  assert.match(source, /biography:\s*draft\.biography/);
  assert.match(source, /\.\.\.resolveCityGroup\(profile\)/);
});

test('Me page keeps accessible touch targets, dark mode, and reduced-motion treatment', () => {
  const styles = read('miniprogram/pages/me/index.wxss');

  assert.match(styles, /\.me-profile__edit\s*\{[\s\S]*?min-height:\s*(?:8[8-9]|9\d|[1-9]\d{2,})rpx/);
  assert.match(styles, /\.me-link-row\s*\{[\s\S]*?min-height:\s*(?:8[8-9]|9\d|[1-9]\d{2,})rpx/);
  assert.match(styles, /\.me-city-group__action\s*\{[\s\S]*?min-height:\s*(?:8[8-9]|9\d|[1-9]\d{2,})rpx/);
  assert.match(styles, /@media\s*\(prefers-color-scheme:\s*dark\)/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});
