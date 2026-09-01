import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('activity discovery is a branded independent surface with restrained phase-one positioning', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  const styles = read('miniprogram/pages/events/index.wxss');
  const config = JSON.parse(read('miniprogram/pages/events/index.json'));

  assert.equal(config.navigationBarTitleText, 'AB Club 活动');
  assert.match(template, /src="\/assets\/brand\/ab-club-crest\.png"/);
  assert.match(template, /GLOBAL GATHERINGS/);
  assert.match(template, /活动是数字名片连接后的轻量延伸/);
  assert.match(template, /本月精选/);
  assert.match(template, /近期方向/);
  assert.match(template, /城市主题/);
  assert.match(template, /活动逐步开放，先以名片连接彼此/);
  assert.match(source, /listActivityDemoEvents/);
  assert.match(source, /buildDemoSections/);
  assert.match(styles, /--canvas:\s*#f4efe5/i);
  assert.match(styles, /--ink:\s*#211e1a/i);
  assert.match(styles, /--gold:\s*#8a6538/i);
  assert.doesNotMatch(styles, /#(?:173c32|102821|1d463b|7ac9a5|246b4a)|--ab-color-green/i);
});

test('top city rail exposes the frozen thirteen-city directory without inventing operations', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');

  assert.match(source, /const frontRow = CITY_DIRECTORY\.filter\(\(city\) =>/);
  assert.match(source, /const rest = CITY_DIRECTORY\.filter\(/);
  assert.match(source, /\[\.\.\.frontRow, \.\.\.rest\]\.map\(\(city\) =>/);
  assert.doesNotMatch(source, /PENDING_CITY_FILTERS|cn-taipei|台北/);
  assert.match(source, /cityFilters:\s*buildCityFilters\(DEFAULT_CITY\.id\)/);
  assert.match(template, /wx:for="\{\{cityFilters\}\}"/);
  assert.match(template, /查看 7 国 13 城完整目录/);
  assert.match(template, /城市目录为展示用，当地节点陆续开放中/);
  assert.doesNotMatch(template, /运营中|已开放|席位|余位|立即报名/);
});

test('activity cards only use local images and preserve the selected-city directory route contract', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  const demoSource = read('miniprogram/components/ab-event-card/demo-data.ts');

  assert.doesNotMatch(`${source}\n${demoSource}`, /https?:\/\//);
  assert.match(demoSource, /\['\/assets\/editorial-events\//);
  assert.match(template, /cover-src="\{\{item\.coverSrc\}\}"/);
  assert.match(template, /cover-alt="\{\{item\.coverAlt\}\}"/);
  assert.match(source, /url:\s*`\/packageEvents\/pages\/city\/index\?cityId=\$\{encodeURIComponent\(this\.data\.selectedCityId\)\}`/);
});

test('DEMO_ONLY and no-registration boundaries remain explicit but no transaction CTA is rendered', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');

  assert.match(template, /本机预览/);
  assert.match(template, /当前不开放报名/);
  assert.match(template, /活动逐步开放，先以名片连接彼此/);
  assert.match(source, /正式请求失败后不会回退为合成活动/);
  assert.doesNotMatch(template, /<button[^>]*>[^<]*(?:报名|支付|购买|登记兴趣)/s);
});

test('city and category controls rebuild all three event modules from one stable demo catalog', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  const demoSource = read('miniprogram/components/ab-event-card/demo-data.ts');

  for (const label of ['全部', '艺术', '古董', '珠宝', '商业交流']) {
    assert.match(source, new RegExp(`label: '${label}'`));
  }
  assert.match(source, /selectCity[\s\S]*applyDemoFilters\(cityId, this\.data\.selectedCategoryId\)/);
  assert.match(source, /selectCategory[\s\S]*applyDemoFilters\(this\.data\.selectedCityId, categoryId\)/);
  assert.match(source, /safeSetStorageSync\('ab-events-city-id', city\.id\)/);
  assert.match(source, /featuredEvents:[\s\S]*upcomingEvents:[\s\S]*cityThemeEvents:/);
  assert.match(demoSource, /demo:activity:\$\{city\.id\}:\$\{category\[0\]\}:\$\{section\[0\]\}/);
  assert.match(demoSource, /getDemoEventById[\s\S]*listActivityDemoEvents\(\)\.find/);
  assert.equal((template.match(/bind:open="openEvent"/g) ?? []).length, 1);
  assert.equal((template.match(/detail-available="\{\{item\.detailAvailable\}\}"/g) ?? []).length, 1);
  assert.equal((template.match(/<template is="event-list"/g) ?? []).length, 3);
});

test('activity layout protects small screens, long copy, dark mode, reduced motion, and the safe bottom', () => {
  const template = read('miniprogram/pages/events/index.wxml');
  const styles = read('miniprogram/pages/events/index.wxss');
  const detailStyles = read('miniprogram/packageEvents/pages/event/index.wxss');

  assert.match(template, /class="events-page ab-safe-bottom"/);
  assert.match(styles, /overflow-x:\s*hidden/);
  assert.match(styles, /padding-bottom:\s*calc\([^;]*env\(safe-area-inset-bottom\)/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /@media\s*\(max-width:\s*360px\)/);
  assert.match(styles, /\.city-directory-note[\s\S]*flex-direction:\s*column/);
  assert.match(styles, /font-family:\s*Georgia,\s*"Songti SC",\s*"STSong",\s*SimSun,\s*serif/);
  assert.match(styles, /prefers-color-scheme:\s*dark/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.match(detailStyles, /overflow-x:\s*hidden/);
  assert.match(detailStyles, /env\(safe-area-inset-bottom\)/);
  assert.match(detailStyles, /overflow-wrap:\s*anywhere/);
});

test('every generated city-category-section ID resolves to the same stable demo detail', async () => {
  const entryPoint = fileURLToPath(new URL(
    '../../../miniprogram/components/ab-event-card/demo-data.ts',
    import.meta.url,
  ));
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  });
  const bundled = result.outputFiles[0]?.text;
  assert.ok(bundled);
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}`;
  const catalog = await import(moduleUrl);
  const events = catalog.listActivityDemoEvents();

  assert.equal(events.length, 13 * 4 * 3);
  assert.equal(new Set(events.map((event) => event.eventId)).size, events.length);
  for (const event of events) {
    assert.equal(event.eventId, `demo:activity:${event.cityId}:${event.categoryId}:${event.sectionId}`);
    assert.deepEqual(catalog.getDemoEventById(event.eventId), event);
    assert.match(event.summary, /^活动方向/);
  }
});
