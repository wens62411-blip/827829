import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sourcePath = resolve(repoRoot, 'miniprogram/pages/card/services/native-share-card.ts');
const sharePagePath = resolve(repoRoot, 'miniprogram/packageCard/pages/share/index.ts');
const shareTemplatePath = resolve(repoRoot, 'miniprogram/packageCard/pages/share/index.wxml');

async function loadService() {
  const output = buildSync({
    entryPoints: [sourcePath],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  }).outputFiles[0]?.text;
  assert.ok(output);
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  return import(url);
}

test('native share card keeps five bounded custom labels and only valid public contacts', async () => {
  const { normalizeNativeShareCard } = await loadService();
  const result = normalizeNativeShareCard({
    displayName: '  林知遥\u0000  ',
    headline: '跨文化艺术与品牌连接者',
    biography: '愿意认识认真做事的人。',
    labels: ['策展人', '策展人', '艺术收藏观察者长期标签', '珠宝', '旅行', '全球商业', '城市生活'],
    phone: '+41 44 555 01 10',
    email: 'demo@example.com',
    demoMode: true,
  });

  assert.equal(result.displayName, '林知遥');
  assert.equal(result.labels.length, 5);
  assert.equal(new Set(result.labels).size, 5);
  assert.ok(result.labels.every((label) => Array.from(label).length <= 10));
  assert.equal(result.phone, '+41 44 555 01 10');
  assert.equal(result.email, 'demo@example.com');
  assert.equal(result.demoMode, true);

  const hidden = normalizeNativeShareCard({ phone: 'not-a-phone', email: 'bad email' });
  assert.equal(hidden.phone, '');
  assert.equal(hidden.email, '');
});

test('native share card resolves pixel ratio on old base libraries without getWindowInfo', async () => {
  const { resolveNativeShareCardPixelRatio } = await loadService();

  assert.equal(resolveNativeShareCardPixelRatio({
    getSystemInfoSync: () => ({ pixelRatio: 2.5 }),
  }), 2.5);
  assert.equal(resolveNativeShareCardPixelRatio({
    getWindowInfo: () => { throw new Error('unsupported'); },
    getSystemInfoSync: () => ({ pixelRatio: 2 }),
  }), 2);
  assert.equal(resolveNativeShareCardPixelRatio({}), 1);
  assert.equal(resolveNativeShareCardPixelRatio({
    getWindowInfo: () => ({ pixelRatio: 8 }),
  }), 3);
});

test('native share card uses a 5:4 editorial layout with vertical name and divider', () => {
  const source = readFileSync(sourcePath, 'utf8');
  assert.match(source, /NATIVE_SHARE_CARD_WIDTH\s*=\s*600/);
  assert.match(source, /NATIVE_SHARE_CARD_HEIGHT\s*=\s*480/);
  assert.match(source, /drawVerticalName/);
  assert.match(source, /moveTo\(112\.5,\s*102\)[\s\S]*lineTo\(112\.5,\s*399\)/);
  assert.doesNotMatch(source, /PRIVATE BY CHOICE|SHARED WITH INTENT|让个人风格，成为第一印象|愿在新的城市里/);
  assert.match(source, /content\.phone\s*\?/);
  assert.match(source, /content\.email\s*\?/);
});

test('owner poster page keeps native sharing available without customer-facing forwarding tests', () => {
  const page = readFileSync(sharePagePath, 'utf8');
  const template = readFileSync(shareTemplatePath, 'utf8');

  assert.match(page, /drawNativeShareCard\(canvas/);
  assert.match(page, /phone:\s*draft\?\.showPhone\s*\?\s*draft\.phone\s*:\s*''/);
  assert.match(page, /email:\s*draft\?\.showEmail\s*\?\s*draft\.email\s*:\s*''/);
  assert.match(page, /imageUrl:\s*this\.data\.shareCoverPath/g);
  assert.match(template, /id="nativeShareCardCanvas"/);
  assert.match(template, /名片海报/);
  assert.doesNotMatch(template, /disabled="\{\{shareCoverState\s*!==\s*'READY'\}\}"/);
  assert.doesNotMatch(template, /微信分享卡片预览|转发测试|WECHAT SHARE CARD/);
});

function luminance(hex) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

test('personal covers follow the explicit card theme and keep readable text in every palette', async () => {
  const { normalizeNativeShareCard, resolveNativeShareCardPalette } = await loadService();
  assert.equal(normalizeNativeShareCard({ theme: 'unknown' }).theme, 'ivory');
  const seen = new Set();
  for (const theme of ['ivory', 'ink', 'champagne', 'stone']) {
    const normalized = normalizeNativeShareCard({ theme });
    assert.equal(normalized.theme, theme);
    const palette = resolveNativeShareCardPalette(theme);
    seen.add(palette.paper.join(','));
    for (const textColor of [palette.ink, palette.muted, palette.accent]) {
      for (const background of palette.paper) {
        const a = luminance(textColor), b = luminance(background);
        assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${theme}: ${textColor} on ${background}`);
      }
    }
  }
  assert.equal(seen.size, 4);
});

test('cover renderer uses the selected palette without invented profile text or hidden contacts', async () => {
  const { drawNativeShareCard, resolveNativeShareCardPalette } = await loadService();
  const originalWx = globalThis.wx;
  globalThis.wx = { getWindowInfo: () => ({ pixelRatio: 2 }) };
  try {
    for (const theme of ['ivory', 'ink', 'champagne', 'stone']) {
      const texts = [], stops = [];
      const context = {
        scale() {}, save() {}, restore() {}, fillRect() {}, strokeRect() {},
        beginPath() {}, moveTo() {}, lineTo() {}, stroke() {},
        createLinearGradient: () => ({ addColorStop: (_, color) => stops.push(color) }),
        measureText: value => ({ width: Array.from(value).length * 16 }),
        fillText(value) { texts.push({ value, color: this.fillStyle }); },
      };
      const canvas = { getContext: () => context };
      const content = drawNativeShareCard(canvas, { displayName: '林雅', theme });
      assert.equal(content.theme, theme);
      assert.deepEqual(stops, [...resolveNativeShareCardPalette(theme).paper]);
      assert.ok(texts.some(t => t.value === '林' && t.color === resolveNativeShareCardPalette(theme).ink));
      assert.doesNotMatch(texts.map(t => t.value).join(' '), /TEL|MAIL|ABOUT|CONTACT|让个人风格|愿在新的城市|PRIVATE BY CHOICE/);
      assert.equal(canvas.width, 1200);
      assert.equal(canvas.height, 960);
    }
  } finally { globalThis.wx = originalWx; }
});

test('all native cover entry points pass the same card theme as their receiving route', () => {
  for (const page of ['pages/card', 'pages/card-share', 'packageCard/pages/view', 'packageCard/pages/edit', 'packageCard/pages/share']) {
    const source = readFileSync(resolve(repoRoot, `miniprogram/${page}/index.ts`), 'utf8');
    assert.match(source, /(?:prepareNativeShareCardCover\(this|drawNativeShareCard\(canvas), \{[\s\S]*?\btheme(?:\s*:\s*this\.data\.cardTheme)?\s*,/, page);
  }
});
