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
  assert.match(source, /drawClassicalShareFrame/);
  assert.doesNotMatch(source, /PRIVATE BY CHOICE|本机预览|DIGITAL INTRODUCTION/);
});

test('owner share page keeps native forwarding without a required preview step', () => {
  const page = readFileSync(sharePagePath, 'utf8');
  const template = readFileSync(shareTemplatePath, 'utf8');

  assert.match(page, /drawNativeShareCard\(canvas/);
  assert.match(page, /phone:\s*draft\?\.showPhone\s*\?\s*draft\.phone\s*:\s*''/);
  assert.match(page, /email:\s*draft\?\.showEmail\s*\?\s*draft\.email\s*:\s*''/);
  assert.match(page, /imageUrl:\s*this\.data\.shareCoverPath/g);
  assert.match(template, /id="nativeShareCardCanvas"/);
  assert.doesNotMatch(template, /微信分享卡片预览|WECHAT SHARE CARD|微信转发测试/);
  assert.doesNotMatch(template, /disabled="\{\{shareCoverState\s*!==\s*'READY'\}\}"/);
  assert.match(page, /onShareAppMessage/);
  assert.match(template, /bindtap="generatePoster"/);
  assert.match(template, /bindtap="savePosterToAlbum"/);
});

function recordingCanvas() {
  const text = [], lines = [], frames = [];
  const context = {
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1,
    scale() {}, save() {}, restore() {}, beginPath() {}, stroke() {}, closePath() {}, fillRect() {},
    moveTo(x, y) { lines.push(['move', x, y]); },
    lineTo(x, y) { lines.push(['line', x, y]); },
    strokeRect(...values) { frames.push(values); },
    createLinearGradient() { return { addColorStop() {} }; },
    measureText(value) { const fontSize = Number(this.font.match(/([\d.]+)px/)?.[1] ?? 16); return { width: Array.from(value).reduce((sum, c) => sum + (/[^\x00-\x7F]/.test(c) ? 1 : 0.6) * fontSize, 0) }; },
    fillText(value, x, y) { text.push({ value, x, y, color: this.fillStyle, font: this.font }); },
  };
  return { canvas: { width: 0, height: 0, getContext: () => context }, text, lines, frames };
}

test('all share themes draw bounded real fields, fine rules and no developer descriptions', async () => {
  const { drawNativeShareCard, resolveNativeShareCardPalette } = await loadService();
  const previousWx = globalThis.wx;
  globalThis.wx = { getWindowInfo: () => ({ pixelRatio: 2 }) };
  try {
    for (const theme of ['ivory', 'ink', 'champagne', 'stone']) {
      const output = recordingCanvas();
      drawNativeShareCard(output.canvas, {
        displayName: '林知遥', headline: '跨文化艺术收藏与品牌交流',
        biography: '关注艺术、设计与城市生活。'.repeat(8),
        labels: ['艺术收藏与文化交流', '古典建筑与欧洲旅行', '跨境品牌与商业合作', '珠宝设计与艺术生活', '长期主义与城市文化'],
        phone: '+41 44 555 01 10', email: 'art@example.com', demoMode: true, theme,
      });
      assert.equal(output.canvas.width, 1200);
      assert.equal(output.canvas.height, 960);
      assert.ok(output.frames.some((frame) => frame[0] === 18.5));
      assert.ok(output.frames.some((frame) => frame[0] === 24.5));
      assert.ok(output.text.some((item) => item.value === '林' && item.x === 65));
      assert.ok(output.text.some((item) => item.value === 'art@example.com'));
      assert.ok(output.text.some((item) => item.value === '+41 44 555 01 10'));
      const color = resolveNativeShareCardPalette(theme).ink;
      assert.equal(output.text.find((item) => item.value === '林').color, color);
      assert.ok(output.text.every((item) => item.y <= 411 && item.y >= 40), `${theme}: drawing stays inside frame`);
      assert.doesNotMatch(output.text.map((item) => item.value).join(''), /本机|预览|未连接|PRIVATE BY|CONTACT|ABOUT/);
      assert.equal(output.text.filter((item) => item.y >= 367 && !item.value.includes('@') && !item.value.includes('+41') && item.x === 148).length, 0, 'biography does not overlap contacts');
    }
    const empty = recordingCanvas();
    drawNativeShareCard(empty.canvas, { displayName: '林知遥', theme: 'ivory' });
    assert.deepEqual(empty.text.map((item) => item.value), ['AB CLUB', '林', '知', '遥']);
  } finally { globalThis.wx = previousWx; }
});

test('every share palette keeps normal text at AA contrast across its paper gradient', async () => {
  const { resolveNativeShareCardPalette } = await loadService();
  const luminance = (hex) => hex.slice(1).match(/.{2}/g).map((v) => parseInt(v, 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  for (const theme of ['ivory', 'ink', 'champagne', 'stone']) {
    const palette = resolveNativeShareCardPalette(theme);
    for (const background of palette.paper) for (const foreground of [palette.ink, palette.muted, palette.accent]) {
      const a = luminance(background), b = luminance(foreground);
      assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${theme}: ${foreground} on ${background}`);
    }
  }
});
