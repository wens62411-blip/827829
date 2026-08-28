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

test('native share card uses a 5:4 editorial layout with vertical name and divider', () => {
  const source = readFileSync(sourcePath, 'utf8');
  assert.match(source, /NATIVE_SHARE_CARD_WIDTH\s*=\s*600/);
  assert.match(source, /NATIVE_SHARE_CARD_HEIGHT\s*=\s*480/);
  assert.match(source, /drawVerticalName/);
  assert.match(source, /moveTo\(112\.5,\s*102\)[\s\S]*lineTo\(112\.5,\s*399\)/);
  assert.match(source, /PRIVATE BY CHOICE · SHARED WITH INTENT/);
  assert.match(source, /content\.phone\s*\?/);
  assert.match(source, /content\.email\s*\?/);
});

test('owner share page previews the exact native cover and gates sharing on public-only export', () => {
  const page = readFileSync(sharePagePath, 'utf8');
  const template = readFileSync(shareTemplatePath, 'utf8');

  assert.match(page, /drawNativeShareCard\(canvas/);
  assert.match(page, /phone:\s*draft\?\.showPhone\s*\?\s*draft\.phone\s*:\s*''/);
  assert.match(page, /email:\s*draft\?\.showEmail\s*\?\s*draft\.email\s*:\s*''/);
  assert.match(page, /imageUrl:\s*this\.data\.shareCoverPath/g);
  assert.match(template, /id="nativeShareCardCanvas"/);
  assert.match(template, /微信分享卡片预览/);
  assert.match(template, /shareCoverState\s*!==\s*'READY'/);
  assert.match(template, /WECHAT SHARE CARD/);
});
