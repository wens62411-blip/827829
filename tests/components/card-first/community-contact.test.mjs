import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8, 'asset must start with the JPEG SOI marker');
  let offset = 2;
  while (offset + 8 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = bytes.readUInt16BE(offset);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {
        height: bytes.readUInt16BE(offset + 3),
        width: bytes.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }
  throw new Error('JPEG dimensions were not found');
}

test('Me community CTA displays and copies the exact operator WeChat id without simulating an add', () => {
  const template = read('miniprogram/pages/me/index.wxml');
  const source = read('miniprogram/pages/me/index.ts');

  assert.match(template, /加入各地巡演群，请添加负责人微信。/);
  assert.match(source, /const COMMUNITY_WECHAT_ID = 'ABclub1';/);
  assert.match(template, /微信号：\{\{communityWechatId\}\}/);

  const copyButton = template.match(/<button\b[^>]*bindtap="copyCommunityWechat"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? '';
  assert.match(copyButton, />复制负责人微信号<\/button>/);
  assert.doesNotMatch(copyButton, /open-type=|navigate|url=/);
  assert.match(source, /copyCommunityWechat\(\)\s*\{[\s\S]*?wx\.setClipboardData\(\{[\s\S]*?data:\s*COMMUNITY_WECHAT_ID/);
  assert.match(source, /success:[\s\S]*?微信号已复制，请前往微信添加负责人。/);
  assert.match(source, /fail:[\s\S]*?复制失败，请手动复制 ABclub1。/);
  assert.match(template, /是否添加及入群以微信内实际操作为准/);
  assert.doesNotMatch(`${template}\n${source}`, /自动进群|已加入群|已添加负责人|群二维码/);
});

test('community salon hero is a sharp lightweight local derivative with auditable source metadata', () => {
  const imagePath = resolve(repoRoot, 'miniprogram/assets/community/european-salon-hero.jpg');
  const bytes = readFileSync(imagePath);
  const manifest = JSON.parse(read('miniprogram/assets/manifests/community.json'));
  const readme = read('miniprogram/assets/community/README.md');
  const source = read('miniprogram/pages/me/index.ts');
  const template = read('miniprogram/pages/me/index.wxml');

  assert.deepEqual(jpegDimensions(bytes), { width: 1440, height: 600 });
  assert.ok(statSync(imagePath).size <= 180 * 1024, 'runtime community hero must remain at or below 180KB');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.asset.sha256);
  assert.equal(manifest.asset.processing.bytes, bytes.length);
  assert.deepEqual(manifest.asset.processing.runtimeDimensions, [1440, 600]);
  assert.equal(manifest.asset.processing.jpegQuality, 76);
  assert.deepEqual(manifest.asset.sourceDimensions, [3840, 2880]);
  assert.deepEqual(manifest.asset.originalDimensions, [4896, 3672]);
  assert.match(manifest.asset.sourceVariant, /Wikimedia 3840px derivative/);
  assert.match(manifest.asset.modificationNotice, /Cropped[\s\S]*resized[\s\S]*compressed/);
  assert.deepEqual(manifest.asset.crop, {
    x: 420,
    y: 500,
    width: 3420,
    height: 1425,
    focus: 'window, framed painting, period seating and inlaid table',
  });
  assert.equal(manifest.asset.sourcePage, 'https://commons.wikimedia.org/wiki/File:Tremezzo_Villa_Carlotta_(interior)_(25).jpg');
  assert.equal(manifest.asset.author, 'Pierre André Leclercq');
  assert.equal(manifest.asset.license, 'CC BY-SA 4.0');
  assert.equal(manifest.asset.reviewStatus, 'DRAFT');
  assert.equal(manifest.asset.publicationPolicy, 'HUMAN_RIGHTS_REVIEW_REQUIRED');
  assert.match(readme, /Pierre André Leclercq[\s\S]*CC BY-SA 4\.0/);
  assert.match(source, /COMMUNITY_IMAGE_SRC = '\/assets\/community\/european-salon-hero\.jpg'/);
  assert.match(template, /src="\{\{cityImageSrc\}\}"[\s\S]*?alt="意大利卡洛塔别墅古典艺术沙龙室内"/);
  assert.match(template, /图片：Pierre André Leclercq（裁切与压缩）· CC BY-SA 4\.0 · Wikimedia Commons/);
});

test('community CTA keeps a high-contrast dark treatment and responsive touch target', () => {
  const styles = read('miniprogram/pages/me/index.wxss');

  assert.match(styles, /\.me-city-group\s*\{[\s\S]*?background:\s*var\(--ab-color-ink\);[\s\S]*?color:\s*var\(--ab-color-paper\);/);
  assert.match(styles, /\.me-city-group__action\s*\{[\s\S]*?min-height:\s*92rpx;/);
  assert.match(styles, /\.me-city-group__action--primary\s*\{[^}]*background:\s*var\(--ab-color-gold-soft\);[^}]*color:\s*#211e1a;/);
  assert.match(styles, /@media\s*\(max-width:\s*340px\)[\s\S]*?\.me-city-group__contact\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.me-city-group__action[\s\S]*?transition:\s*none;/);
});
