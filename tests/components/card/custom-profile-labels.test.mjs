import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

async function loadBundledTypeScript(relativePath) {
  const result = await build({
    entryPoints: [resolve(root, relativePath)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Date.now()}-${Math.random()}`);
}

async function loadOfflineEditorPage() {
  let definition;
  globalThis.Page = (candidate) => { definition = candidate; };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/packageCard/pages/edit/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'offline-editor-identity',
      setup(api) {
        api.onResolve({ filter: /card\/services\/identity-client$/ }, () => ({ path: 'identity', namespace: 'offline-editor' }));
        api.onLoad({ filter: /.*/, namespace: 'offline-editor' }, () => ({
          loader: 'js',
          contents: `
            export const getRuntimeEvidence = () => ({ runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false });
            export const bootstrapIdentity = async () => { throw new Error('offline'); };
            export const getMyProfile = async () => { throw new Error('offline'); };
            export const refreshMyCard = async () => { throw new Error('offline'); };
            export const updateMyProfile = async () => { throw new Error('offline'); };
          `,
        }));
      },
    }],
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Date.now()}-${Math.random()}`);
  return definition;
}

test('custom labels enforce trim, visible-character, control-character, duplicate, and count boundaries', async () => {
  const draft = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-draft.ts');

  assert.deepEqual(draft.validateProfileLabel('  艺术策展  '), { ok: true, value: '艺术策展' });
  assert.equal(draft.validateProfileLabel('   ').code, 'EMPTY');
  assert.equal(draft.validateProfileLabel('艺术\n策展').code, 'CONTROL_CHARACTER');
  assert.equal(draft.validateProfileLabel(`艺${'术'.repeat(10)}`).code, 'TOO_LONG');

  let result = draft.addProfileLabel([], ' 艺术策展 ');
  assert.equal(result.ok, true);
  assert.deepEqual(result.labels, ['艺术策展']);
  result = draft.addProfileLabel(result.labels, '艺术策展');
  assert.equal(result.ok, false);
  assert.equal(result.code, 'DUPLICATE');

  let labels = [];
  for (const label of ['艺术', '古董', '珠宝', '建筑', '电影']) {
    const addition = draft.addProfileLabel(labels, label);
    assert.equal(addition.ok, true);
    labels = addition.labels;
  }
  const sixth = draft.addProfileLabel(labels, '音乐');
  assert.equal(sixth.ok, false);
  assert.equal(sixth.code, 'MAX_COUNT');
  assert.equal(labels.length, 5);
});

test('offline draft persists a sanitized allowlist and showTags is the only public-label gate', async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
  };
  try {
    const draft = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-draft.ts');
    const saved = draft.writeOfflineDemoDraft({
      ...draft.createDefaultOfflineDemoDraft(),
      selectedLabels: [' 艺术 ', '艺术', '珠宝', '建筑', '电影', '音乐'],
      showTags: false,
      injectedPrivateValue: 'must-not-survive',
    });
    assert.equal(saved, true);
    const stored = [...storage.values()][0];
    assert.equal('injectedPrivateValue' in stored, false);
    assert.deepEqual(stored.selectedLabels, ['艺术', '珠宝', '建筑', '电影', '音乐']);

    const hidden = draft.readOfflineDemoDraft();
    assert.deepEqual(draft.publicLabelsForDraft(hidden), []);

    draft.writeOfflineDemoDraft({ ...hidden, showTags: true });
    const visible = draft.readOfflineDemoDraft();
    assert.deepEqual(draft.publicLabelsForDraft(visible), ['艺术', '珠宝', '建筑', '电影', '音乐']);
  } finally {
    delete globalThis.wx;
  }
});

test('offline editor adds, removes, previews, and saves custom labels without a cloud write', async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
  };
  try {
    const definition = await loadOfflineEditorPage();
    assert.ok(definition);
    const page = {
      ...definition,
      data: structuredClone(definition.data),
      setData(patch) { Object.assign(this.data, patch); },
    };
    page.onLoad.call(page);
    assert.equal(page.data.demoMode, true);
    assert.equal(page.data.selectedLabels.length, 4);
    assert.deepEqual(page.data.previewFields.map((field) => field.key), ['phone', 'email']);

    page.onCustomLabelInput.call(page, { detail: { value: '  长期主义  ' } });
    page.addCustomProfileTag.call(page);
    assert.deepEqual(page.data.selectedLabels, ['全球商业', '艺术文化', '古董与珠宝', '城市漫游', '长期主义']);
    assert.deepEqual(page.data.previewPublicLabels, page.data.selectedLabels);

    page.removeProfileTag.call(page, { currentTarget: { dataset: { tag: '古董与珠宝' } } });
    assert.deepEqual(page.data.selectedLabels, ['全球商业', '艺术文化', '城市漫游', '长期主义']);
    page.onModuleToggle.call(page, { currentTarget: { dataset: { module: 'tags' } }, detail: { value: false } });
    assert.deepEqual(page.data.previewPublicLabels, []);
    page.onModuleToggle.call(page, { currentTarget: { dataset: { module: 'phone' } }, detail: { value: false } });
    assert.deepEqual(page.data.previewFields.map((field) => field.key), ['email']);

    await page.saveProfile.call(page);
    assert.equal(page.data.status, 'SAVED');
    assert.match(page.data.message, /本机.*DEMO_ONLY/);
    const persisted = [...storage.values()].find((value) => value?.contractVersion === 1);
    assert.ok(persisted);
    assert.deepEqual(persisted.selectedLabels, page.data.selectedLabels);
    assert.equal(persisted.showTags, false);
    assert.equal(persisted.showPhone, false);
    assert.equal(persisted.showEmail, true);
  } finally {
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('demo share snapshot contains only explicitly public labels and survives a cold-start decode within path budget', async () => {
  const draft = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-draft.ts');
  const snapshot = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts');
  const source = {
    ...draft.createDefaultOfflineDemoDraft(),
    selectedLabels: ['艺术策展', '古董收藏', '珠宝设计', '跨城连接', '长期主义'],
    showTags: true,
  };
  const built = snapshot.buildOfflineDemoSharePath(source, 'champagne');
  assert.equal(built.ok, true);
  assert.ok(built.path.length <= snapshot.OFFLINE_DEMO_SHARE_PATH_BUDGET);
  assert.doesNotMatch(built.path, /艺术策展|demo@|\+41/);

  const encoded = built.path.match(/[?&]snapshot=([^&]+)/)?.[1];
  assert.ok(encoded);
  const decoded = snapshot.decodeOfflineDemoShareSnapshot(encoded);
  assert.equal(decoded.ok, true);
  assert.deepEqual(decoded.snapshot.publicLabels, source.selectedLabels);
  assert.equal(decoded.snapshot.cardTheme, 'champagne');

  const hiddenBuilt = snapshot.buildOfflineDemoSharePath({ ...source, showTags: false }, 'ivory');
  assert.equal(hiddenBuilt.ok, true);
  const hiddenEncoded = hiddenBuilt.path.match(/[?&]snapshot=([^&]+)/)?.[1];
  const hiddenDecoded = snapshot.decodeOfflineDemoShareSnapshot(hiddenEncoded);
  assert.equal(hiddenDecoded.ok, true);
  assert.deepEqual(hiddenDecoded.snapshot.publicLabels, []);

  const tampered = `${encoded.slice(0, -1)}${encoded.endsWith('A') ? 'B' : 'A'}`;
  assert.equal(snapshot.decodeOfflineDemoShareSnapshot(tampered).ok, false);
});

test('share path preflight rejects content that cannot fit instead of silently dropping public labels', async () => {
  const draft = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-draft.ts');
  const snapshot = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts');
  const built = snapshot.buildOfflineDemoSharePath({
    ...draft.createDefaultOfflineDemoDraft(),
    biography: '艺'.repeat(240),
    selectedLabels: ['艺术策展', '古董收藏', '珠宝设计', '跨城连接', '长期主义'],
    showTags: true,
  }, 'stone');
  assert.equal(built.ok, false);
  assert.equal(built.code, 'PATH_TOO_LONG');
});

test('editor and every demo card surface bind the explicit public-label channel', () => {
  const editorTemplate = read('miniprogram/packageCard/pages/edit/index.wxml');
  const editorSource = read('miniprogram/packageCard/pages/edit/index.ts');
  const editorStyles = read('miniprogram/packageCard/pages/edit/index.wxss');
  assert.match(editorTemplate, /bindtap="addCustomProfileTag"/);
  assert.match(editorTemplate, /bindtap="removeProfileTag"/);
  assert.match(editorTemplate, /maxlength="10"/);
  assert.match(editorTemplate, /bindinput="onPhoneInput"/);
  assert.match(editorTemplate, /bindinput="onEmailInput"/);
  assert.match(editorTemplate, /data-module="phone"/);
  assert.match(editorTemplate, /data-module="email"/);
  assert.match(editorSource, /MAX_PROFILE_LABELS/);
  assert.match(editorSource, /showPhone:\s*this\.data\.showPhone/);
  assert.match(editorSource, /showEmail:\s*this\.data\.showEmail/);
  assert.match(editorSource, /buildOfflineDemoSharePath/);
  assert.match(editorStyles, /@media\s*\(max-width:\s*430px\)[\s\S]*?\.card-editor-contact-grid\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);

  const componentSource = read('miniprogram/components/ab-profile-card/index.ts');
  const componentTemplate = read('miniprogram/components/ab-profile-card/index.wxml');
  assert.match(componentSource, /publicLabels:\s*\{ type: Array/);
  assert.match(componentTemplate, /safePublicLabels/);
  assert.doesNotMatch(componentTemplate, /<ab-verified-tag[^>]*safePublicLabels/s);

  for (const path of [
    'miniprogram/packageCard/pages/view/index.wxml',
    'miniprogram/packageCard/pages/share/index.wxml',
    'miniprogram/pages/card-share/index.wxml',
  ]) {
    assert.match(read(path), /public-labels="\{\{demoPublicLabels\}\}"/, path);
  }
});
