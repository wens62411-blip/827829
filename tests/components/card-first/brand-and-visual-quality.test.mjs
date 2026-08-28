import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');
const app = JSON.parse(read('miniprogram/app.json'));
const crestPath = '/assets/brand/ab-club-crest.png';

function pageHasCrest(pagePath) {
  const templatePath = `miniprogram/${pagePath}.wxml`;
  const template = read(templatePath);
  if (template.includes(crestPath)) return true;

  const pageJsonPath = resolve(repoRoot, `miniprogram/${pagePath}.json`);
  const pageConfig = existsSync(pageJsonPath) ? JSON.parse(read(`miniprogram/${pagePath}.json`)) : {};
  const components = { ...(app.usingComponents ?? {}), ...(pageConfig.usingComponents ?? {}) };
  for (const [tag, componentPath] of Object.entries(components)) {
    if (!new RegExp(`<${tag}\\b`).test(template)) continue;
    const componentTemplate = resolve(repoRoot, 'miniprogram', `${String(componentPath).replace(/^\//, '')}.wxml`);
    if (existsSync(componentTemplate) && readFileSync(componentTemplate, 'utf8').includes(crestPath)) return true;
  }
  return false;
}

function hexToRgb(value) {
  const raw = value.slice(1);
  const normalized = raw.length === 3 || raw.length === 4
    ? raw.slice(0, 3).split('').map((character) => character.repeat(2)).join('')
    : raw.slice(0, 6);
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
}

function rgbToHueSaturation([redByte, greenByte, blueByte]) {
  const red = redByte / 255;
  const green = greenByte / 255;
  const blue = blueByte / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (delta && max === red) hue = 60 * (((green - blue) / delta) % 6);
  if (delta && max === green) hue = 60 * (((blue - red) / delta) + 2);
  if (delta && max === blue) hue = 60 * (((red - green) / delta) + 4);
  if (hue < 0) hue += 360;
  return { hue, saturation };
}

function greenPaletteFindings(path) {
  const source = read(path);
  const findings = [];
  if (/--[\w-]*green\b|var\(--[\w-]*green\b/i.test(source)) findings.push('green-named token');
  for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const { hue, saturation } = rgbToHueSaturation(hexToRgb(match[0]));
    if (hue >= 90 && hue <= 180 && saturation >= 0.12) findings.push(match[0].toLowerCase());
  }
  return [...new Set(findings)];
}

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'city asset must be a JPEG');
  for (let offset = 2; offset + 8 < bytes.length;) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  throw new Error('JPEG dimensions not found');
}

test('AB Club crest is present on every registered key card-first page, not only Discover', () => {
  const keyPages = [
    'pages/discover/index',
    'pages/card/index',
    'pages/network/index',
    'pages/me/index',
  ];
  const missing = keyPages.filter((page) => !pageHasCrest(page));
  assert.deepEqual(missing, [], `这些关键页面没有使用统一盾徽：${missing.join(', ')}`);
});

test('main and card-owned user surfaces contain no green palette', () => {
  const styleFiles = [
    'miniprogram/app.json',
    'miniprogram/app.wxss',
    'miniprogram/shared/design-tokens/tokens.wxss',
    'miniprogram/pages/discover/index.wxss',
    'miniprogram/pages/card/index.wxss',
    'miniprogram/pages/card/styles/card-theme.wxss',
    'miniprogram/pages/network/index.wxss',
    'miniprogram/pages/me/index.wxss',
    'miniprogram/packageCard/pages/edit/index.wxss',
    'miniprogram/packageCard/pages/view/index.wxss',
    'miniprogram/packageCard/pages/share/index.wxss',
    'miniprogram/components/ab-profile-card/index.wxss',
    'miniprogram/components/ab-friend-request/index.wxss',
  ];
  const findings = styleFiles.flatMap((path) => greenPaletteFindings(path).map((color) => `${path}: ${color}`));
  assert.deepEqual(findings, []);
});

test('retained city photography is high-resolution and unique in the shipped package', () => {
  const manifest = JSON.parse(read('miniprogram/assets/manifests/cities.json'));
  const errors = [];
  const hashes = [];
  for (const asset of manifest.assets ?? []) {
    const path = resolve(repoRoot, 'miniprogram', 'assets', 'cities', `${asset.cityId}.jpg`);
    if (!existsSync(path)) {
      errors.push(`${asset.cityId}: missing`);
      continue;
    }
    const bytes = readFileSync(path);
    const dimensions = jpegDimensions(bytes);
    const hash = createHash('sha256').update(bytes).digest('hex');
    hashes.push(hash);
    if (dimensions.width < 768 || dimensions.height < 432) {
      errors.push(`${asset.cityId}: ${dimensions.width}x${dimensions.height}，低于 768x432 高清门槛`);
    }
  }
  if (new Set(hashes).size !== hashes.length) errors.push('城市图片存在重复文件内容');
  if ((manifest.processingProfile?.runtimeWidth ?? 0) < 768 || (manifest.processingProfile?.runtimeHeight ?? 0) < 432) {
    errors.push(`manifest runtime ${manifest.processingProfile?.runtimeWidth}x${manifest.processingProfile?.runtimeHeight} 仍是小缩略图`);
  }
  assert.deepEqual(errors, []);
});

test('retained event covers do not reuse city hero/card photographs', () => {
  const eventsTemplate = read('miniprogram/pages/events/index.wxml');
  if (!/cover-src=/.test(eventsTemplate)) return;
  const eventSource = read('miniprogram/pages/events/index.ts');
  assert.doesNotMatch(
    eventSource,
    /coverSrc\s*:\s*(?:city\s*\?\s*)?`?\/assets\/cities\//,
    '活动卡若保留图片，应使用独立活动/编辑图片，不能复用城市图或城市 Hero',
  );
});

test('profile card follows the confirmed LinkedIn-like hierarchy and four restrained themes', () => {
  const template = read('miniprogram/components/ab-profile-card/index.wxml');
  const styles = read('miniprogram/components/ab-profile-card/index.wxss');
  const source = read('miniprogram/components/ab-profile-card/index.ts');

  const orderedMarkers = [
    'profile-card__masthead',
    'profile-card__cover',
    'profile-card__main',
    'profile-card__biography',
    'profile-card__selected-labels',
    'profile-card__gallery-section',
  ];
  let previousIndex = -1;
  for (const marker of orderedMarkers) {
    const currentIndex = template.indexOf(marker);
    assert.ok(currentIndex > previousIndex, `${marker} 未按品牌栏、封面、身份、关于我、标签、图片的层级排列`);
    previousIndex = currentIndex;
  }

  assert.ok(
    template.indexOf('profile-card__slot-actions') < template.indexOf('profile-card__biography'),
    '交换与分享动作应在关于我之前进入第一屏资料区',
  );
  for (const theme of ['ivory', 'ink', 'champagne', 'stone']) {
    assert.match(source, new RegExp(`['"]${theme}['"]`));
    if (theme !== 'ivory') assert.match(styles, new RegExp(`profile-card--theme-${theme}`));
  }
  assert.match(styles, /grid-template-columns:\s*132rpx minmax\(0, 1fr\)/);
  assert.match(styles, /@media \(max-width: 380px\)[\s\S]*profile-card__field[\s\S]*minmax\(0, 1fr\)/);
  assert.doesNotMatch(styles, /--[\w-]*green\b|var\(--[\w-]*green\b/i);
});

test('owner card makes edit and share clear while network stays out of the owner action block', () => {
  const template = read('miniprogram/pages/card/index.wxml');
  const primaryEditIndex = template.indexOf('编辑名片');
  const shareIndex = template.indexOf('分享名片');
  const editIndex = template.indexOf('编辑资料');
  const privacyIndex = template.indexOf('查看隐私范围');

  assert.ok(primaryEditIndex >= 0 && shareIndex > primaryEditIndex, '名片第一动作区需要按编辑、分享排列');
  assert.ok(editIndex > shareIndex && privacyIndex > shareIndex, '编辑与隐私应位于核心交换/分享动作之后');
  assert.doesNotMatch(template, /交换名片|\/pages\/network\/index/);
  assert.match(template, /card-link-button card-link-button--strong[^>]*bindtap="openShare"/);
  assert.match(template, /selected-labels="\{\{demoMode \? demoSelectedLabels : \[\]\}\}"/);
  assert.match(template, /gallery-urls="\{\{demoGalleryUrls\}\}"/);
  assert.match(template, /theme="\{\{cardTheme\}\}"/);
  assert.match(template, /标签必须先经过人工审核/);
  assert.match(template, /SYNTHETIC · DEMO_ONLY/);
  assert.doesNotMatch(template, /一键分享的安全预览|WECHAT SHARE|安全转发|OPENID|小程序码|海报|token/i);
});
