import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const pageRoot = new URL('../../../miniprogram/pages/discover/', import.meta.url);
const repoRoot = new URL('../../../', pageRoot);
const readPage = (name) => readFileSync(new URL(name, pageRoot), 'utf8');
const readRepo = (path) => readFileSync(new URL(path, repoRoot), 'utf8');

test('Discover is an explicit offline editorial demo rather than a placeholder', () => {
  const source = readPage('index.ts');
  const template = readPage('index.wxml');

  assert.doesNotMatch(source, /createPlaceholderPage/);
  assert.match(source, /RuntimeMode\.OFFLINE_DEMO/);
  assert.match(template, /本地展示版本/);
  assert.match(template, /SYNTHETIC/);
  assert.match(template, /DEMO_ONLY/);
  assert.match(template, /不代表真实排期、活动已开放或可以报名/);
  assert.doesNotMatch(template, /隐私边界，先说清楚|无需认证即可/);
  assert.match(source, /title:\s*'AB Club · OFFLINE DEMO/);
});

test('Discover exposes a restrained card entry while network, event, and art stay secondary', () => {
  const template = readPage('index.wxml');

  for (const route of [
    '/packageCard/pages/edit/index',
    '/pages/card/index',
    '/pages/network/index',
    '/pages/events/index',
    '/packageArt/pages/channel/index',
  ]) {
    assert.match(template, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(template, /艺术、古董与珠宝/);
  assert.match(template, /packageEvents\/pages\/event\/index\?demoEventId=\{\{primaryEvent\.eventId\}\}/);
  assert.match(template, /完整名片只在进入名片页后展示/);
  assert.doesNotMatch(template, /discover-card__profile|discover-card__avatar|AB Club 示例名片/);
});

test('Discover keeps one stable demo event identity and title into event detail', () => {
  const source = readPage('index.ts');
  const template = readPage('index.wxml');
  const demoSource = readRepo('miniprogram/components/ab-event-card/demo-data.ts');
  const detailSource = readRepo('miniprogram/packageEvents/pages/event/index.ts');

  assert.match(source, /DISCOVER_DEMO_EVENTS\[0\]/);
  assert.match(template, /demoEventId=\{\{primaryEvent\.eventId\}\}/);
  assert.match(template, /\{\{primaryEvent\.title\}\}/);
  assert.doesNotMatch(template, /demoCityId=/);
  assert.match(demoSource, /私人收藏与家族传承对话/);
  assert.match(demoSource, /getDemoEventById/);
  assert.match(detailSource, /query\.demoEventId\s*\?\s*getDemoEventById\(query\.demoEventId\)\s*:\s*undefined/);
  assert.match(detailSource, /detail:\s*toDemoDetail\(demo\)/);
  assert.doesNotMatch(detailSource, /(?:make|create).*Demo.*\(query\.demoEventId\)/i);
});

test('Discover images fail closed to local accessible placeholders', () => {
  const source = readPage('index.ts');
  const template = readPage('index.wxml');
  const imageTags = [...template.matchAll(/<image\b[^>]*>/g)].map((match) => match[0]);
  const guardedContentImages = imageTags.filter((tag) => /data-image-key="(?:brand|event|city)"/.test(tag));

  assert.equal(guardedContentImages.length, 3, '品牌、精选活动和城市视觉应分别失败闭环');
  for (const imageTag of guardedContentImages) assert.match(imageTag, /binderror="handleImageError"/);
  assert.equal(imageTags.length, guardedContentImages.length, '发现页的内容图片都应有失败闭环，文字入口不依赖装饰图标');
  assert.match(source, /handleImageError\(event:/);
  for (const key of ['brand', 'event', 'city']) assert.match(source, new RegExp(`imageKey === '${key}'`));
  assert.match(template, /本地活动视觉暂不可用 · 不使用外链替代/);
  assert.match(template, /本地城市视觉暂不可用/);
  assert.doesNotMatch(`${source}\n${template}`, /https?:\/\//);
});

test('Discover uses the transparent AB Club crest and its frozen local manifest', () => {
  const template = readPage('index.wxml');
  const styles = readPage('index.wxss');
  const manifest = JSON.parse(readRepo('miniprogram/assets/manifests/brand.json'));
  const bytes = readFileSync(new URL('miniprogram/assets/brand/ab-club-crest.png', repoRoot));
  const digest = createHash('sha256').update(bytes).digest('hex');

  assert.match(template, /src="\/assets\/brand\/ab-club-crest\.png"/);
  assert.match(template, /alt="AB Club 盾徽标志"/);
  assert.match(template, /data-image-key="brand"/);
  assert.match(styles, /\.discover-brandmark,\s*\n\.discover-brandmark__fallback\s*\{[\s\S]*?width:\s*80rpx;[\s\S]*?height:\s*80rpx/);
  assert.equal(manifest.asset.path, '/assets/brand/ab-club-crest.png');
  assert.deepEqual([manifest.asset.width, manifest.asset.height], [384, 384]);
  assert.equal(manifest.asset.bytes, bytes.length);
  assert.equal(manifest.asset.sha256, digest);
  assert.equal(manifest.asset.hasAlpha, true);
  assert.equal(manifest.asset.externalHotlink, false);
  assert.equal(manifest.asset.reviewStatus, 'DRAFT');
});

test('Discover controls meet touch targets and keep the approved light canvas', () => {
  const styles = readPage('index.wxss');

  assert.match(styles, /\.discover-card-entry__primary,\s*\n\.discover-card-entry__secondary\s*\{[\s\S]*?min-height:\s*88rpx/);
  assert.match(styles, /\.discover-text-link\s*\{[\s\S]*?min-height:\s*88rpx/);
  assert.doesNotMatch(styles, /@media\s*\(prefers-color-scheme:\s*dark\)/, '首页品牌画布不应跟随系统强制反色');
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
});

test('Discover names every launch city and uses shipped city/editorial photographs', () => {
  const source = readPage('index.ts');
  const template = readPage('index.wxml');
  const cityManifest = JSON.parse(readRepo('miniprogram/assets/manifests/cities.json'));
  const editorialManifest = JSON.parse(readRepo('miniprogram/assets/manifests/editorial-events.json'));

  assert.match(source, /\/assets\/cities\/ch-zurich\.jpg/);
  assert.match(source, /\/assets\/editorial-events\/jewelry-study\.jpg/);
  for (const city of ['北京', '上海', '广州', '深圳', '杭州', '苏黎世', '米兰', '巴黎', '新加坡', '墨尔本', '悉尼', '多伦多', '温哥华']) {
    assert.match(source, new RegExp(city));
  }
  assert.match(template, /正式发布前仍需完成人工版权复核/);
  assert.equal(cityManifest.assets.some((asset) => asset.cityId === 'ch-zurich'), true);
  assert.equal(editorialManifest.assets.some((asset) => asset.id === 'jewelry-study'), true);
  assert.equal(cityManifest.processingProfile.runtimeWidth, 1152);
  assert.equal(editorialManifest.processingProfile.runtimeWidth, 1152);
});
