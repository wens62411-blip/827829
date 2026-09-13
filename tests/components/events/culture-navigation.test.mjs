import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

async function loadPage(path) {
  const bundle = await build({
    entryPoints: [fileURLToPath(new URL(`../../../miniprogram/${path}.ts`, import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs', target: 'es2020', write: false,
  });
  let definition;
  const navigation = [], modals = [], patches = [];
  runInNewContext(bundle.outputFiles[0].text, {
    Page(page) { definition = page; },
    wx: {
      navigateTo(options) { navigation.push(options.url); },
      showModal(options) { modals.push(options); },
    },
  });
  const page = {
    ...definition, data: structuredClone(definition.data),
    setData(patch, callback) { patches.push(patch); Object.assign(this.data, patch); callback?.(); },
  };
  return { page, navigation, modals, patches };
}
const tap = (dataset) => ({ currentTarget: { dataset } });

test('the three culture entries open their own secondary destination without touching card state', async () => {
  const { page, navigation } = await loadPage('pages/events/index');
  assert.deepEqual(Array.from(page.data.portals, (entry) => entry.id), ['calendar', 'public-good', 'pearls']);
  for (const id of ['calendar', 'public-good', 'pearls']) page.openPortal(tap({ portalId: id }));
  assert.deepEqual(navigation, ['calendar', 'public-good', 'pearls'].map((id) => `/packageEvents/pages/${id}/index`));
  page.openPortal(tap({ portalId: '../packageCard/pages/edit/index' }));
  page.openPortal(tap({}));
  assert.equal(navigation.length, 3, 'unknown entry identifiers never become an arbitrary route');
});

test('annual entries stay chronological inside each month without changing their original dates', async () => {
  const { page } = await loadPage('packageEvents/pages/calendar/index');
  assert.equal(page.data.months.length, 12);
  for (const month of page.data.months) {
    const days = Array.from(month.events, (entry) => parseInt(entry.date, 10));
    assert.deepEqual(days, [...days].sort((a, b) => a - b));
  }
  assert.equal(page.data.months.flatMap((month) => month.events).length, 20);
  assert.match(page.onShareAppMessage().title, new RegExp(page.data.year));
});

test('repeat month taps reset the native target and reject invalid anchors', async () => {
  const { page, patches } = await loadPage('packageEvents/pages/calendar/index');
  page.jumpToMonth(tap({ anchor: 'month-dec' }));
  page.jumpToMonth(tap({ anchor: 'month-dec' }));
  assert.deepEqual(patches.map((patch) => patch.activeMonthAnchor), ['', 'month-dec', '', 'month-dec']);
  page.jumpToMonth(tap({ anchor: 'unregistered-month' }));
  assert.equal(patches.length, 4);
});

test('calendar event clicks present the selected real content instead of a dead-end detail promise', async () => {
  const { page, modals } = await loadPage('packageEvents/pages/calendar/index');
  const entry = page.data.months[0].events[0];
  page.openCalendarEvent(tap({ eventId: entry.id }));
  assert.equal(modals[0].title, entry.titleZh);
  for (const field of ['titleEn', 'date', 'venue', 'summary']) assert.ok(modals[0].content.includes(entry[field]));
  page.openCalendarEvent(tap({ eventId: 'unknown' }));
  assert.equal(modals.length, 1);
});

test('calendar keeps its warm-dark edition and matching native navigation in both system themes', () => {
  const base = new URL('../../../miniprogram/packageEvents/pages/calendar/', import.meta.url);
  const style = readFileSync(new URL('index.wxss', base), 'utf8');
  const config = JSON.parse(readFileSync(new URL('index.json', base), 'utf8'));
  assert.match(style, /--canvas:\s*#24211e/);
  assert.doesNotMatch(style, /prefers-color-scheme:\s*light/);
  assert.equal(config.navigationBarBackgroundColor, '#24211e');
  assert.equal(config.navigationBarTextStyle, 'white');
  assert.equal(config.backgroundColor, '#24211e');
});
