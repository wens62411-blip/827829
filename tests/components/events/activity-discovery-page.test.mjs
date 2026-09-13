import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../../../', import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, (value) => value.slice(1)).replace(/\/$/, '');
const read = (path) => readFileSync(`${root}/${path}`, 'utf8');

test('activity一级页 is a three-entry AB Club index with bilingual labels', () => {
  const source = read('miniprogram/pages/events/index.ts');
  const template = read('miniprogram/pages/events/index.wxml');
  const styles = read('miniprogram/pages/events/index.wxss');
  const config = JSON.parse(read('miniprogram/pages/events/index.json'));

  assert.equal(config.navigationBarTitleText, 'AB Club 活动');
  assert.match(template, /src="\/assets\/brand\/ab-club-crest\.png"/);
  for (const [english, chinese] of [
    ['GLOBAL ART CALENDAR', '全球艺术日历'],
    ['SPIRIT PEARLS', '灵气珍珠'],
    ['PUBLIC GOOD', '公益'],
  ]) {
    assert.match(source, new RegExp(english));
    assert.match(source, new RegExp(chinese));
    assert.match(template, /wx:for="\{\{portals\}\}"/);
  }
  assert.equal((source.match(/id: '(?:calendar|pearls|public-good)'/g) ?? []).length, 3);
  assert.match(source, /wx\.navigateTo\(\{ url: '\/packageEvents\/pages\/calendar\/index' \}\)/);
  assert.match(template, /class="portal-entry portal-entry--\{\{item\.id\}\}"/);
  assert.equal((template.match(/bindtap="openPortal"/g) ?? []).length, 1);
  assert.doesNotMatch(template, /ab-event-card|城市筛选|活动分类|本月精选|近期方向|城市主题/);
  assert.doesNotMatch(source, /callCloudAction|listActivityDemoEvents|CITY_DIRECTORY/);
  assert.match(styles, /--canvas:\s*#24211e/i);
  assert.match(styles, /--gold:\s*#d8bd84/i);
  assert.match(styles, /prefers-color-scheme:\s*light/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});

test('global art calendar route is registered as a second-level page only', () => {
  const app = JSON.parse(read('miniprogram/app.json'));
  const eventsPackage = app.subpackages.find((entry) => entry.root === 'packageEvents');
  assert.ok(eventsPackage);
  assert.ok(eventsPackage.pages.includes('pages/calendar/index'));
  assert.equal(app.tabBar.list.filter((item) => item.pagePath === 'pages/events/index').length, 1);
  assert.equal(app.tabBar.list.length, 3);

  for (const extension of ['.ts', '.json', '.wxml', '.wxss']) {
    assert.equal(existsSync(`${root}/miniprogram/packageEvents/pages/calendar/index${extension}`), true);
  }
});

test('calendar page presents a JAN-to-DEC timeline with bilingual event facts and light interaction', () => {
  const source = read('miniprogram/packageEvents/pages/calendar/index.ts');
  const template = read('miniprogram/packageEvents/pages/calendar/index.wxml');
  const styles = read('miniprogram/packageEvents/pages/calendar/index.wxss');
  const config = JSON.parse(read('miniprogram/packageEvents/pages/calendar/index.json'));

  assert.equal(config.navigationBarTitleText, 'GLOBAL ART CALENDAR');
  assert.match(template, /GLOBAL ART CALENDAR/);
  assert.match(template, /全球艺术日历/);
  assert.match(template, /scroll-into-view="\{\{activeMonthAnchor\}\}"/);
  assert.match(template, /wx:for="\{\{monthNav\}\}"/);
  assert.match(template, /wx:for="\{\{months\}\}"/);
  assert.match(template, /wx:for-item="calendarEvent"/);
  assert.match(template, /calendarEvent\.titleEn/);
  assert.match(template, /calendarEvent\.titleZh/);
  assert.match(template, /calendarEvent\.date/);
  assert.match(template, /calendarEvent\.venue/);
  assert.match(template, /bindtap="openCalendarEvent"/);
  assert.match(source, /jumpToMonth\(/);
  assert.match(source, /wx\.showModal/);
  assert.match(styles, /--canvas:\s*#24211e/i);
  assert.match(styles, /calendar-event--featured/);
  assert.doesNotMatch(styles, /prefers-color-scheme:\s*light/);
  assert.equal(config.navigationBarBackgroundColor, '#24211e');
  assert.equal(config.navigationBarTextStyle, 'white');
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(`${source}\n${template}`, /日期待定|票务|支付|报名|价格|SKU/);
});

test('calendar data keeps exactly the supplied 2026 dates and featured hierarchy', () => {
  const source = read('miniprogram/packageEvents/data/calendar.ts');

  assert.equal((source.match(/month\('/g) ?? []).length, 12);
  assert.equal((source.match(/event\('calendar-2026-/g) ?? []).length, 20);
  assert.equal((source.match(/'calendar-2026-[^']+'[^\n]*true\)/g) ?? []).length, 7);
  for (const date of [
    '22–31 JAN 2026', '23–25 JAN 2026', '26 FEB–1 MAR 2026', '14–19 MAR 2026',
    '27–29 MAR 2026', '25–29 MAR 2026', '23–29 MAR 2026', '14–17 MAY 2026',
    '7–10 MAY 2026', '9 MAY–22 NOV 2026', '21–24 MAY 2026', '22–31 MAY 2026',
    '18–21 JUN 2026', '2–5 SEP 2026', '2–6 SEP 2026', '24–27 SEP 2026',
    '14–18 OCT 2026', '14–18 OCT 2026', '23–25 OCT 2026', '4–6 DEC 2026',
  ]) assert.match(source, new RegExp(date));
  assert.doesNotMatch(source, /待定|TBD|日期待确认/);
});
