import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const pageRoot = new URL('../../../miniprogram/pages/discover/', import.meta.url);

test('Discover is a complete offline demo rather than a placeholder', () => {
  const source = readFileSync(new URL('index.ts', pageRoot), 'utf8');
  const template = readFileSync(new URL('index.wxml', pageRoot), 'utf8');

  assert.doesNotMatch(source, /createPlaceholderPage/);
  assert.match(source, /RuntimeMode\.OFFLINE_DEMO/);
  assert.match(template, /本地展示版本/);
  assert.match(template, /不代表真实审核、真实报名或线上发布/);
  assert.match(template, /人工审核/);
  assert.match(source, /title:\s*'AB Club · OFFLINE DEMO/);
});

test('Discover exposes the frozen product journey and art entry', () => {
  const template = readFileSync(new URL('index.wxml', pageRoot), 'utf8');

  for (const route of [
    '/pages/card/index',
    '/pages/network/index',
    '/pages/events/index',
    '/packageArt/pages/channel/index',
  ]) {
    assert.match(template, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(template, /艺术、古董与珠宝/);
  assert.match(template, /packageEvents\/pages\/event\/index\?demoEventId=\{\{item\.eventId\}\}/);
});

test('Discover demo cards preserve one stable identity and title into event detail', () => {
  const source = readFileSync(new URL('index.ts', pageRoot), 'utf8');
  const template = readFileSync(new URL('index.wxml', pageRoot), 'utf8');
  const demoSource = readFileSync(new URL('../../../miniprogram/components/ab-event-card/demo-data.ts', import.meta.url), 'utf8');
  const detailSource = readFileSync(new URL('../../../miniprogram/packageEvents/pages/event/index.ts', import.meta.url), 'utf8');

  assert.match(source, /DISCOVER_DEMO_EVENTS/);
  assert.match(template, /wx:key="eventId"/);
  assert.match(template, /demoEventId=\{\{item\.eventId\}\}/);
  assert.match(template, /\{\{item\.title\}\}/);
  assert.doesNotMatch(template, /demoCityId=\{\{item\.cityId\}\}/);
  for (const title of ['私人收藏与家族传承对话', '西湖边的品牌与艺术晚宴', '全球创业者连接之夜']) {
    assert.match(demoSource, new RegExp(title));
  }
  assert.match(demoSource, /getDemoEventById/);
  assert.match(detailSource, /makeDemoDetailByEventId\(query\.demoEventId\)/);
  assert.match(detailSource, /getDemoEventById\(eventId\)/);
  assert.match(detailSource, /没有根据任意 URL 参数生成或替换活动身份/);
});

test('Discover images fail closed to local accessible placeholders', () => {
  const source = readFileSync(new URL('index.ts', pageRoot), 'utf8');
  const template = readFileSync(new URL('index.wxml', pageRoot), 'utf8');
  const imageTags = [...template.matchAll(/<image\b[^>]*>/g)].map((match) => match[0]);

  assert.equal(imageTags.length, 4);
  for (const imageTag of imageTags) assert.match(imageTag, /binderror="handleImageError"/);
  assert.match(source, /handleImageError\(event:/);
  assert.match(source, /imageKey === 'brand'/);
  assert.match(source, /imageKey\.startsWith\('city:'\)/);
  assert.match(source, /featuredCities\.some\(\(city\) => city\.id === cityId\)/);
  assert.match(template, /本地城市影像暂不可用 · 不使用外链替代/);
  assert.match(template, /本地视觉占位暂不可用 · 不使用外链替代/);
  assert.doesNotMatch(`${source}\n${template}`, /https?:\/\//);
});

test('Discover replaces the boxed AB monogram with the transparent AB Club crest', () => {
  const template = readFileSync(new URL('index.wxml', pageRoot), 'utf8');
  const styles = readFileSync(new URL('index.wxss', pageRoot), 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../../../miniprogram/assets/manifests/brand.json', import.meta.url), 'utf8'));
  const bytes = readFileSync(new URL('../../../miniprogram/assets/brand/ab-club-crest.png', import.meta.url));
  const digest = createHash('sha256').update(bytes).digest('hex');

  assert.match(template, /src="\/assets\/brand\/ab-club-crest\.png"/);
  assert.match(template, /alt="AB Club 盾徽标志"/);
  assert.match(template, /data-image-key="brand"/);
  assert.doesNotMatch(template, /class="discover-monogram"/);
  assert.match(styles, /\.discover-brandmark\{[^}]*width:120rpx;[^}]*height:120rpx/);
  assert.match(template, /AB CLUB<\/text>/);
  assert.equal(manifest.asset.path, '/assets/brand/ab-club-crest.png');
  assert.deepEqual([manifest.asset.width, manifest.asset.height], [384, 384]);
  assert.equal(manifest.asset.bytes, bytes.length);
  assert.equal(manifest.asset.sha256, digest);
  assert.equal(manifest.asset.hasAlpha, true);
  assert.equal(bytes[25], 6, 'PNG must use RGBA color type');
  assert.equal(manifest.asset.externalHotlink, false);
  assert.equal(manifest.asset.rightsState, 'UNVERIFIED');
  assert.equal(manifest.asset.reviewStatus, 'DRAFT');
  assert.equal(manifest.asset.publicationPolicy, 'HUMAN_BRAND_RIGHTS_REVIEW_REQUIRED');
  assert.equal(manifest.asset.authorClaim, 'USER_SUPPLIED_UNVERIFIED');
  assert.equal(manifest.asset.processingType, 'AI_BACKGROUND_EXTRACTION');
  assert.equal(manifest.asset.referenceOriginalIncluded, false);
  assert.equal(manifest.asset.sourcePathPersisted, false);
});

test('Discover navigation targets and rendered controls respect motion accessibility', () => {
  const styles = readFileSync(new URL('index.wxss', pageRoot), 'utf8');
  const globalStyles = readFileSync(new URL('../../../miniprogram/app.wxss', import.meta.url), 'utf8');
  const textLinkRule = styles.match(/\.discover-text-link\s*\{([^}]*)\}/)?.[1];

  assert.equal(typeof textLinkRule, 'string');
  assert.match(textLinkRule, /min-height:\s*88rpx/);
  assert.match(styles, /\.discover-journey__item\{[^}]*min-height:132rpx/);
  assert.match(styles, /\.discover-city-card\{[^}]*height:292rpx/);
  assert.match(styles, /\.discover-event\{[^}]*min-height:112rpx/);
  assert.match(styles, /\.discover-primary,.discover-outline\{[^}]*min-height:96rpx/);
  assert.match(globalStyles, /page, view, button, image, text, navigator, picker\s*\{/);
});

test('Discover uses local city photographs and names every launch city', () => {
  const source = readFileSync(new URL('index.ts', pageRoot), 'utf8');
  const template = readFileSync(new URL('index.wxml', pageRoot), 'utf8');

  assert.match(template, /\/assets\/hero\/zurich-960\.jpg/);
  assert.match(source, /\/assets\/cities\/cn-hangzhou\.jpg/);
  for (const city of ['北京', '上海', '广州', '深圳', '杭州', '苏黎世', '米兰', '巴黎', '新加坡', '墨尔本', '悉尼', '多伦多', '温哥华']) {
    assert.match(source, new RegExp(city));
  }
  assert.match(template, /正式发布前仍需完成人工版权复核/);
});

test('Discover hero uses a local high-resolution source with explicit draft rights evidence', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../../miniprogram/assets/manifests/hero.json', import.meta.url), 'utf8'));
  const bytes = readFileSync(new URL('../../../miniprogram/assets/hero/zurich-960.jpg', import.meta.url));
  const digest = createHash('sha256').update(bytes).digest('hex');

  assert.equal(manifest.asset.path, '/assets/hero/zurich-960.jpg');
  assert.deepEqual([manifest.asset.width, manifest.asset.height], [960, 473]);
  assert.equal(manifest.asset.bytes, bytes.length);
  assert.equal(manifest.asset.sha256, digest);
  assert.equal(manifest.asset.license, 'CC BY-SA 4.0');
  assert.equal(manifest.asset.reviewStatus, 'DRAFT');
  assert.equal(manifest.asset.externalHotlink, false);
});
