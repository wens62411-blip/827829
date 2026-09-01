import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pageRoot = new URL('../../../miniprogram/pages/discover/', import.meta.url);
const read = (name) => readFileSync(new URL(name, pageRoot), 'utf8');

function eventDetailLinks(template) {
  return [...template.matchAll(/<navigator\b[^>]*url="\/packageEvents\/pages\/event\/index\?demoEventId=[^"]+"[^>]*>/g)];
}

function unnegatedPositiveClaims(source) {
  const findings = [];
  for (const match of source.matchAll(/报名成功|申请成功|已加入|活动已开放/g)) {
    const context = source.slice(Math.max(0, match.index - 18), match.index + match[0].length);
    if (!/不代表|并非|没有|尚未|未|不会|不能/.test(context)) findings.push(match[0]);
  }
  return findings;
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

test('Discover v3 leads with brand and a restrained hero card action', () => {
  const template = read('index.wxml');
  const styles = read('index.wxss');
  const heroOffset = template.indexOf('class="discover-hero"');
  const eventOffset = template.indexOf('全球城市艺术活动');
  const cityOffset = template.indexOf('id="global-city-directory"');

  assert.ok(heroOffset >= 0, '发现页缺少主视觉区');
  assert.ok(eventOffset > heroOffset, '活动必须位于主视觉之后');
  assert.ok(cityOffset > eventOffset, '城市目录必须位于活动之后');

  assert.doesNotMatch(template, /discover-card-entry|discover-quick-link|discover-focus/);
  assert.doesNotMatch(template, /你的身份，值得被更好地介绍|值得认识|艺术与器物/);
  assert.doesNotMatch(template, /url="\/(?:pages\/card|packageCard\/pages\/(?:edit|view|share))\//);
  assert.doesNotMatch(template, /discover-card__profile|discover-card__avatar|AB Club 示例名片/);
  assert.doesNotMatch(template, /discover-journey|discover-hero__image/);
  assert.match(template, /class="discover-primary-action__label">生成我的 AI 赛博名片<\/text>/);
  assert.match(styles, /\.discover-topbar\s*\{[^}]*box-sizing:\s*border-box;/);
  assert.match(styles, /\.discover-primary-action__label\s*\{[^}]*text-align:\s*center;[^}]*white-space:\s*nowrap;/);
});

test('Discover v3 keeps people, gathering, art, and city modules intentionally lightweight', () => {
  const template = read('index.wxml');

  assert.equal(eventDetailLinks(template).length, 1, '首页只应保留一张精选活动卡');
  assert.doesNotMatch(template, /wx:for="\{\{secondaryEvents\}\}"|class="discover-event-list"/);
  assert.match(template, /本机预览/);
  assert.match(template, /内容预览/);
  assert.doesNotMatch(template, /体验版|DEMO_ONLY|仅供预览|仅做数据示例/);
  assert.match(template, /7国13城 · 逐步开放/);
});

test('Discover v3 reuses local high-resolution city and editorial assets and fails closed', () => {
  const source = read('index.ts');
  const template = read('index.wxml');
  const imageTags = [...template.matchAll(/<image\b[^>]*>/g)].map((match) => match[0]);
  const guardedContentImages = imageTags.filter((tag) => /data-image-key="(?:brand|event|city)"/.test(tag));

  assert.match(source, /\/assets\/editorial-events\/jewelry-study\.jpg/);
  assert.match(source, /\/assets\/cities\/ch-zurich\.jpg/);
  assert.deepEqual(
    guardedContentImages.map((tag) => tag.match(/data-image-key="([^"]+)"/)[1]),
    ['brand', 'event', 'city'],
  );
  for (const imageTag of guardedContentImages) assert.match(imageTag, /binderror="handleImageError"/);
  assert.doesNotMatch(`${source}\n${template}`, /https?:\/\//);
});

test('Discover v3 keeps truthful capability copy and readable restrained styling', () => {
  const template = read('index.wxml');
  const styles = read('index.wxss');
  const fontSizes = [...styles.matchAll(/font-size:\s*(\d+)rpx/g)].map((match) => Number(match[1]));

  assert.doesNotMatch(template, /连接可以克制，也可以长久/);
  assert.doesNotMatch(template, /你决定展示哪些资料|公开什么，由你决定/);
  assert.doesNotMatch(template, /更多自定义(?:范围)?将逐步开放/);
  assert.doesNotMatch(template, /职业与兴趣字段仅作预览，当前不代表已经保存/);
  assert.doesNotMatch(template, /当前不是名片浏览或交换流水/);
  assert.doesNotMatch(template, /隐私边界，先说清楚|无需认证即可/);
  assert.deepEqual(unnegatedPositiveClaims(template), []);
  assert.ok(fontSizes.length > 0);
  assert.deepEqual(fontSizes.filter((size) => size < 20), [], '首页不应继续使用低于 20rpx 的辅助文字');
  assert.match(styles, /var\(--ab-color-ivory\)/);
  assert.ok(contrastRatio('5f5a52', 'f4efe6') >= 4.5);
  assert.ok(contrastRatio('725126', 'ebe3d6') >= 4.5);
  assert.doesNotMatch(styles, /@media\s*\(prefers-color-scheme:\s*dark\)/, '首页保持品牌浅色画布，墨黑只由用户选择的名片主题触发');
  assert.match(styles, /--discover-accent:\s*#725126/, '首页主色应保持高对比香槟金');
  assert.match(styles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(styles, /\bgreen\b|--[\w-]*green/i);
});
