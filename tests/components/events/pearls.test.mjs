import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '../../..');
const compiled = await build({ entryPoints: [resolve(root, 'miniprogram/packageEvents/pages/pearls/index.ts')], bundle: true, platform: 'node', format: 'cjs', target: 'es2020', write: false, logLevel: 'silent' });
const template = readFileSync(resolve(root, 'miniprogram/packageEvents/pages/pearls/index.wxml'), 'utf8');

function createPage({ clipboardThrows = false } = {}) {
  let definition;
  const previews = [];
  const clipboard = [];
  const toasts = [];
  runInNewContext(compiled.outputFiles[0].text, {
    Page(value) { definition = value; },
    wx: {
      previewImage(options) { previews.push(options); },
      setClipboardData(options) { if (clipboardThrows) throw new Error('unavailable'); clipboard.push(options); },
      showToast(options) { toasts.push(options); },
    },
  });
  const page = { ...definition, data: structuredClone(definition.data), setData(patch) { for (const [key, value] of Object.entries(patch)) { const parts = key.split('.'); if (parts.length === 2) this.data[parts[0]][parts[1]] = value; else this.data[key] = value; } } };
  return { page, previews, clipboard, toasts };
}

test('pearl category choice and shared entry carry only valid pearl intent into native contact', () => {
  const { page } = createPage();
  page.onLoad({ category: 'south-sea-white' });
  assert.equal(page.data.selectionLabel, '澳白');
  assert.equal(page.data.contactContext, 'AB Club 珍珠选珠 · 澳白');
  page.chooseCategory({ currentTarget: { dataset: { id: 'akoya' } } });
  assert.equal(page.data.selectionLabel, 'Akoya');
  page.chooseCategory({ currentTarget: { dataset: { id: '__proto__' } } });
  assert.equal(page.data.activeCategory, 'akoya');
  assert.match(template, /open-type="contact"/);
  assert.match(template, /session-from="\{\{contactContext\}\}"/);
  assert.doesNotMatch(compiled.outputFiles[0].text, /getStorageSync|setStorageSync|local-identity|identityApi|requestPayment/);
});

test('only shipped reference photos can be previewed and image failures retain category selection', () => {
  const { page, previews } = createPage();
  const category = page.data.categories[0];
  page.previewPhoto({ currentTarget: { dataset: { src: category.image } } });
  assert.equal(previews.length, 1);
  assert.equal(previews[0].current, category.image);
  assert.equal(previews[0].urls.length, 5);
  page.previewPhoto({ currentTarget: { dataset: { src: 'https://unapproved.example/image.jpg' } } });
  assert.equal(previews.length, 1);
  page.handleImageError({ currentTarget: { dataset: { id: category.id } } });
  assert.equal(page.data.imageFailures.freshwater, true);
  page.chooseCategory({ currentTarget: { dataset: { id: category.id } } });
  assert.equal(page.data.selectionLabel, '淡水珠');
  assert.equal(page.data.categories.find((item) => item.id === 'south-sea-white').image, '', 'unverified Australian provenance must not be replaced with an Indonesian pearl photograph');
});

test('contact fallback de-duplicates clipboard requests and reports actual callback outcomes', () => {
  const { page, clipboard, toasts } = createPage();
  page.copyWechat(); page.copyWechat();
  assert.equal(clipboard.length, 1);
  assert.equal(clipboard[0].data, 'ABclub1');
  assert.equal(toasts.length, 0);
  clipboard[0].success(); clipboard[0].complete();
  assert.equal(toasts.at(-1).title, '微信号已复制');
  assert.equal(page.data.copying, false);
  page.handleContact({ detail: { errMsg: 'contact:fail' } });
  assert.match(toasts.at(-1).title, /复制下方微信号/);
  const count = toasts.length;
  page.handleContact({ detail: { errMsg: 'contact:cancel' } });
  assert.equal(toasts.length, count);
  const broken = createPage({ clipboardThrows: true });
  assert.doesNotThrow(() => broken.page.copyWechat());
  assert.equal(broken.page.data.copying, false);
  assert.match(broken.toasts.at(-1).title, /长按微信号/);
});

test('reference images have in-app credits, recorded hashes and fit the subpackage photo budget', () => {
  const { page, clipboard } = createPage();
  const evidence = readFileSync(resolve(root, 'docs/pearl-image-sources.md'), 'utf8');
  let total = 0;
  for (const credit of page.data.imageCredits) {
    assert.ok(credit.author && credit.license && credit.sourceUrl && credit.licenseUrl);
    const path = resolve(root, `miniprogram${credit.image}`);
    const bytes = readFileSync(path);
    assert.equal(bytes.readUInt16BE(0), 0xffd8, `${credit.id} must be a real JPEG file`);
    assert.ok(statSync(path).size > 10000);
    total += bytes.length;
    assert.ok(evidence.includes(createHash('sha256').update(bytes).digest('hex').toUpperCase()));
  }
  assert.ok(total <= 1_200_000);
  page.toggleImageCredits();
  assert.equal(page.data.showImageCredits, true);
  page.copyImageSource({ currentTarget: { dataset: { id: 'akoya' } } });
  assert.match(clipboard[0].data, /Mauro Cateb/);
  assert.match(clipboard[0].data, /https:\/\/creativecommons.org\/licenses\/by-sa\/4.0\//);
});

test('native contact message cards restore only this page and known pearl categories', () => {
  const { page, toasts } = createPage();
  page.handleContact({ detail: { errMsg: 'contact:ok', path: '/packageEvents/pages/pearls/index', query: { category: 'akoya' } } });
  assert.equal(page.data.activeCategory, 'akoya');
  page.handleContact({ detail: { path: 'packageEvents/pages/pearls/index', query: { category: 'south-sea-white' } } });
  assert.equal(page.data.activeCategory, 'south-sea-white');
  assert.equal(page.data.contactContext, 'AB Club 珍珠选珠 · 澳白');
  for (const detail of [
    { path: '/pages/card/index', query: { category: 'freshwater' } },
    { path: '//packageEvents/pages/pearls/index', query: { category: 'freshwater' } },
    { path: '/packageEvents/pages/pearls/index?category=freshwater', query: { category: 'freshwater' } },
    { path: '/packageEvents/pages/pearls/index', query: { category: '__proto__' } },
    { path: '/packageEvents/pages/pearls/index', query: { category: ['freshwater'] } },
    { path: '/packageEvents/pages/pearls/index' },
    { errMsg: 'contact:cancel', path: '/packageEvents/pages/pearls/index', query: { category: 'freshwater' } },
  ]) {
    assert.doesNotThrow(() => page.handleContact({ detail }));
    assert.equal(page.data.activeCategory, 'south-sea-white');
  }
  assert.equal(toasts.length, 0);
  assert.doesNotMatch(compiled.outputFiles[0].text, /wx\.(?:navigateTo|redirectTo|reLaunch|switchTab)/);
});

test('image-source clipboard failures offer a visible, selectable source link without throwing', () => {
  const tap = { currentTarget: { dataset: { id: 'akoya' } } };
  const broken = createPage({ clipboardThrows: true });
  broken.page.toggleImageCredits();
  assert.doesNotThrow(() => broken.page.copyImageSource(tap));
  assert.equal(broken.toasts.at(-1).title, '请长按来源链接复制');
  assert.equal(broken.toasts.at(-1).icon, 'none');
  const callbackFailure = createPage();
  callbackFailure.page.copyImageSource(tap);
  callbackFailure.clipboard[0].fail();
  assert.equal(callbackFailure.toasts.at(-1).title, '请长按来源链接复制');
  assert.match(template, /<text user-select="\{\{true\}\}" class="pearl-credit__url">\{\{item\.sourceUrl\}\}<\/text>/);
  assert.match(template, /wx:if="\{\{showImageCredits\}\}"/);
});
