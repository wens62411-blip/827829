import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('activity discovery is a branded independent surface with restrained phase-one positioning', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  const styles = read('miniprogram/pages/events/index.wxss');
  const config = JSON.parse(read('miniprogram/pages/events/index.json'));

  assert.equal(config.navigationBarTitleText, 'AB Club 活动');
  assert.match(template, /src="\/assets\/brand\/ab-club-crest\.png"/);
  assert.match(template, /GLOBAL GATHERINGS · PHASE 01/);
  assert.match(template, /活动是数字名片连接后的轻量延伸/);
  assert.match(template, /精选活动方向/);
  assert.match(template, /一期以名片为核心，活动保持轻量/);
  assert.match(source, /return DISCOVER_DEMO_EVENTS\.map/);
  assert.match(styles, /--events-canvas:\s*#f4efe5/i);
  assert.match(styles, /--events-ink:\s*#211e1a/i);
  assert.match(styles, /--events-gold:\s*#8a6538/i);
  assert.doesNotMatch(styles, /#(?:173c32|102821|1d463b|7ac9a5|246b4a)|--ab-color-green/i);
});

test('country filter exposes the frozen seven-country thirteen-city directory without inventing operations', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');

  assert.match(source, /COUNTRY_DIRECTORY/);
  assert.match(source, /REGION_DIRECTORY/);
  assert.match(source, /CITY_DIRECTORY\.filter\(\(city\) => countryId === ALL_COUNTRIES/);
  assert.match(source, /countryFilters:\s*buildCountryFilters\(ALL_COUNTRIES\)/);
  assert.match(source, /cityPreviews:\s*buildCityPreviews\(ALL_COUNTRIES\)/);
  assert.match(template, /wx:for="\{\{countryFilters\}\}"/);
  assert.match(template, /wx:for="\{\{cityPreviews\}\}"/);
  assert.match(template, /7 国 · 13 城/);
  assert.match(template, /不等于当地节点已经运营/);
  assert.doesNotMatch(template, /运营中|已开放|席位|余位|立即报名/);
});

test('city previews only use local images, fail closed, and preserve the existing city route contract', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');

  assert.match(source, /imageSrc:\s*`\/assets\/cities\/\$\{city\.id\}\.jpg`/);
  assert.doesNotMatch(source, /https?:\/\//);
  assert.match(template, /src="\{\{item\.imageSrc\}\}"/);
  assert.match(template, /alt="\{\{item\.imageAlt\}\}"/);
  assert.match(template, /binderror="onCityImageError"/);
  assert.match(template, /wx:else[^>]*city-preview__fallback/);
  assert.match(source, /imageFailed:\s*true/);
  assert.match(source, /url:\s*`\/packageEvents\/pages\/city\/index\?cityId=\$\{encodeURIComponent\(cityId\)\}`/);
});

test('DEMO_ONLY and no-registration boundaries remain explicit but no transaction CTA is rendered', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');

  assert.match(template, /DEMO_ONLY/);
  assert.match(template, /不代表真实排期、场地确认、合作关系或城市节点已运营/);
  assert.match(template, /活动报名、支付、签到、主理人招募、商户入驻与交易撮合均不属于第一阶段/);
  assert.match(source, /正式请求失败后不会回退为合成活动/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:报名|支付|购买|登记兴趣)/s);
});
