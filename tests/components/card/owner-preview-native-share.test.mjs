import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const identity = { contractVersion: 1, displayName: '甲的名片', biography: '个人介绍', profession: '独立设计师', cityId: 'ch-zurich', selectedLabels: ['艺术', '设计'], showTags: true, phone: '13800138000', email: 'private@example.com', showPhone: true, showEmail: true };

async function loadPreview() {
  let definition;
  globalThis.Page = (value) => { definition = value; };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/packageCard/pages/view/index.ts')], bundle: true,
    platform: 'node', format: 'esm', write: false, logLevel: 'silent',
    plugins: [{ name: 'personal-cover-spy', setup(api) {
      api.onResolve({ filter: /services\/native-share-card$/ }, () => ({ path: 'cover', namespace: 'preview-test' }));
      api.onLoad({ filter: /.*/, namespace: 'preview-test' }, () => ({ contents: 'export const prepareNativeShareCardCover = async (page, input) => { globalThis.__previewCover = input; return globalThis.__previewCoverHook ? globalThis.__previewCoverHook(input) : "wxfile://personal-current.png"; };', loader: 'js' }));
    } }],
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Math.random()}`);
  return { ...definition, data: structuredClone(definition.data), setData(patch) { Object.assign(this.data, patch); } };
}

function install() {
  globalThis.getApp = () => ({ globalData: { runtimeMode: 'OFFLINE_DEMO', cloudEnvironmentConfigured: false } });
  const navigation = [];
  globalThis.wx = {
    getStorageSync(key) { return key === 'ab.club.local-identity.v1' ? identity : undefined; },
    hideShareMenu() {}, showShareMenu() {}, setNavigationBarTitle() {},
    navigateTo(args) { navigation.push(args); },
  };
  return navigation;
}

function cleanup() { delete globalThis.wx; delete globalThis.getApp; delete globalThis.Page; delete globalThis.__previewCover; delete globalThis.__previewCoverHook; }

test('finished owner preview shares current card directly with public personal cover and no navigation', async () => {
  const navigation = install();
  try {
    const page = await loadPreview();
    page.onLoad({});
    await page.loadCard();
    const payload = page.onShareAppMessage();
    assert.equal(page.data.ownerShareReady, true);
    assert.match(payload.path, /^\/pages\/card-share\/index\?local=1&snapshot=/);
    assert.equal(payload.imageUrl, 'wxfile://personal-current.png');
    assert.equal(globalThis.__previewCover.displayName, identity.displayName);
    assert.deepEqual(globalThis.__previewCover.labels, ['艺术', '设计']);
    assert.equal(globalThis.__previewCover.phone, undefined);
    assert.equal(globalThis.__previewCover.email, undefined);
    assert.deepEqual(navigation, []);
    page.onUnload();
    assert.equal(page.onShareAppMessage().path, '/pages/card-share/index?invalid=1');
  } finally { cleanup(); }
});

test('visitor preview does not enable an owner share or edit the recipient card', async () => {
  install();
  try {
    const page = await loadPreview();
    page.onLoad({ preview: 'STRANGER' });
    await page.loadCard();
    assert.equal(page.data.viewerMode, 'STRANGER');
    assert.equal(page.data.ownerShareReady, false);
    assert.equal(globalThis.__previewCover, undefined);
    assert.equal(page.onShareAppMessage().path, '/pages/card-share/index?invalid=1');
  } finally { cleanup(); }
});

test('owner preview keeps the latest payload when an earlier cover completes after reload', async () => {
  install();
  const pending = [];
  let currentIdentity = { ...identity, displayName: '旧资料' };
  globalThis.wx.getStorageSync = (key) => key === 'ab.club.local-identity.v1' ? currentIdentity : undefined;
  globalThis.__previewCoverHook = (input) => new Promise((resolveCover) => pending.push({ input, resolveCover }));
  try {
    const page = await loadPreview();
    page.onLoad({});
    const oldLoad = page.loadCard();
    currentIdentity = { ...identity, displayName: '最新资料' };
    const latestLoad = page.loadCard();
    assert.equal(pending.length, 2);
    pending[1].resolveCover('wxfile://latest.png');
    await latestLoad;
    const latestPayload = page.onShareAppMessage();
    pending[0].resolveCover('wxfile://old.png');
    await oldLoad;
    assert.deepEqual(page.onShareAppMessage(), latestPayload);
    assert.equal(page.data.card.displayName, '最新资料');
    assert.equal(page.data.ownerShareReady, true);
    assert.equal(latestPayload.imageUrl, 'wxfile://latest.png');
  } finally { cleanup(); }
});
