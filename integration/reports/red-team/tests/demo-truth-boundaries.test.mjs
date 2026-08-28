import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path) => readFileSync(join(root, path), 'utf8');

test('[P1][OPEN] OFFLINE_DEMO Discover share title drops the demo truth boundary', () => {
  const source = read('miniprogram/pages/discover/index.ts');
  assert.match(source, /runtimeMode:\s*RuntimeMode\.OFFLINE_DEMO/);
  const share = source.match(/onShareAppMessage\(\)\s*\{([\s\S]*?)\n\s*\},?\n\}\);/)?.[1];
  assert.equal(typeof share, 'string');
  assert.match(share, /全球可信连接与城市文化/);
  assert.doesNotMatch(share, /DEMO|演示|合成|本地展示/);
});

test('[P2][OPEN] Discover images lack failure fallbacks and its text link lacks a 44px target', () => {
  const template = read('miniprogram/pages/discover/index.wxml');
  const styles = read('miniprogram/pages/discover/index.wxss');
  const imageTags = [...template.matchAll(/<image\b[^>]*>/g)].map((match) => match[0]);
  assert.ok(imageTags.length >= 3);
  for (const imageTag of imageTags) assert.doesNotMatch(imageTag, /binderror=/);

  const textLinkRule = styles.match(/\.discover-text-link\s*\{([^}]*)\}/)?.[1];
  assert.equal(typeof textLinkRule, 'string');
  assert.match(textLinkRule, /font-size:\s*24rpx/);
  assert.match(textLinkRule, /padding-bottom:\s*8rpx/);
  assert.doesNotMatch(textLinkRule, /min-height:\s*88rpx/);
});

test('[P2][OPEN] demo event cards route by city and resolve to a different event identity', () => {
  const discoverSource = read('miniprogram/pages/discover/index.ts');
  const discoverTemplate = read('miniprogram/pages/discover/index.wxml');
  const artFixture = read('miniprogram/packageArt/data/demo.ts');
  const artDetail = read('miniprogram/packageArt/pages/detail/index.ts');
  const eventFactory = read('miniprogram/components/ab-event-card/demo-data.ts');

  assert.match(discoverSource, /私人收藏与家族传承对话/);
  assert.match(discoverTemplate, /demoCityId=\{\{item\.cityId\}\}/);
  assert.doesNotMatch(discoverTemplate, /demoEventId=|eventId=\{\{item\.eventId\}\}/);
  assert.match(artFixture, /作品资料阅读会（DEMO_ONLY）/);
  assert.match(artDetail, /demoCityId=\$\{encodeURIComponent\(cityId\)\}/);
  assert.match(eventFactory, /title:\s*`\$\{city\.name\.zh\} · \$\{concept\[0\]\}`/);
  assert.doesNotMatch(eventFactory, /私人收藏与家族传承对话|作品资料阅读会/);
});
