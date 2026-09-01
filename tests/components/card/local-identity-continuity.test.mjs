import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

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

const LOCAL_IDENTITY = {
  contractVersion: 1,
  displayName: '真实填写者',
  biography: '',
  profession: '独立策展人',
  cityId: 'cn-shenzhen',
  selectedLabels: ['策展', '珠宝'],
  showTags: true,
  phone: '+86 138 0013 8000',
  email: 'private@example.com',
  showPhone: true,
  showEmail: false,
  registeredAt: '2026-08-31T08:00:00.000Z',
};

test('local identity projection contains only user input and safe local defaults', async () => {
  const local = await loadBundledTypeScript('miniprogram/pages/card/services/local-identity.ts');
  const card = local.materializeLocalIdentityCard(LOCAL_IDENTITY);
  const profile = local.materializeLocalIdentityProfile(LOCAL_IDENTITY);
  const fields = local.materializeLocalIdentityFields(LOCAL_IDENTITY);

  assert.equal(card.displayName, LOCAL_IDENTITY.displayName);
  assert.equal(card.headline, LOCAL_IDENTITY.profession);
  assert.equal(card.biography, '', 'an intentionally blank biography must not revive demo copy');
  assert.equal(card.origin, 'REAL');
  assert.equal(card.verificationState, 'USER_DECLARED');
  assert.deepEqual(card.claims, []);
  assert.doesNotMatch(`${card.cardId} ${card.ownerUserId}`, /synthetic|demo/i);
  assert.deepEqual(fields, [
    { key: 'profession', label: '职业', value: LOCAL_IDENTITY.profession },
    { key: 'phone', label: '电话', value: LOCAL_IDENTITY.phone },
  ]);
  assert.equal(profile.displayName, LOCAL_IDENTITY.displayName);
  assert.equal(profile.cityId, LOCAL_IDENTITY.cityId);
  assert.equal(profile.biography, '');
  assert.doesNotMatch(`${profile.profileId} ${profile.userId}`, /synthetic|demo/i);
  assert.doesNotMatch(JSON.stringify({ card, profile, fields }), /合成示例|AB Atelier|艺术史与全球商业/);
});

test('local identity share snapshot stays local, privacy-filtered, and free of demo fixtures', async () => {
  const snapshot = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts');
  const built = snapshot.buildLocalIdentitySharePath(LOCAL_IDENTITY, 'stone');
  assert.equal(built.ok, true);
  assert.match(built.path, /^\/pages\/card-share\/index\?local=1&snapshot=/);

  const encoded = built.path.match(/[?&]snapshot=([^&]+)/)?.[1];
  assert.ok(encoded);
  const decoded = snapshot.decodeOfflineDemoShareSnapshot(encoded);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.snapshot.source, 'LOCAL');
  assert.equal(decoded.snapshot.card.displayName, LOCAL_IDENTITY.displayName);
  assert.equal(decoded.snapshot.card.biography, '');
  assert.doesNotMatch(`${decoded.snapshot.card.cardId} ${decoded.snapshot.card.ownerUserId}`, /synthetic|demo/i);
  assert.deepEqual(decoded.snapshot.publicLabels, ['策展', '珠宝']);
  assert.equal(decoded.snapshot.fields.some((field) => field.key === 'phone'), false);
  assert.equal(decoded.snapshot.fields.some((field) => field.key === 'email'), false);
  assert.equal(decoded.snapshot.fields.some((field) => field.key === 'education'), false);
  assert.doesNotMatch(JSON.stringify(decoded.snapshot), /合成示例|AB Atelier|艺术史与全球商业/);
  assert.doesNotMatch(JSON.stringify(decoded.snapshot), /138 0013 8000|private@example\.com/);
  assert.doesNotMatch(built.encodedSnapshot, /138|private|example/);
});

test('all owner entry surfaces prefer a registered local identity over the legacy draft', () => {
  const discover = read('miniprogram/pages/discover/index.ts');
  const view = read('miniprogram/packageCard/pages/view/index.ts');
  const share = read('miniprogram/packageCard/pages/share/index.ts');

  assert.match(discover, /hasLocalIdentity\(\)/);
  assert.match(discover, /hasLocalIdentity\(\)\s*\?\s*'\/pages\/card\/index'\s*:\s*'\/packageCard\/pages\/edit\/index\?register=1'/);
  assert.doesNotMatch(discover, /hasOfflineDemoDraft/);
  assert.match(view, /readLocalIdentity\(\)/);
  assert.match(view, /materializeLocalIdentityCard/);
  assert.match(share, /readLocalIdentity\(\)/);
  assert.match(share, /createLocalIdentityShareSnapshot/);
  assert.match(share, /buildLocalIdentitySharePath/);
});

test('register mode renders an empty creation form and becomes ready only after a successful save', () => {
  const editor = read('miniprogram/packageCard/pages/edit/index.ts');
  const template = read('miniprogram/packageCard/pages/edit/index.wxml');
  const registerBranch = editor.slice(
    editor.indexOf('if (localReady || registerMode)'),
    editor.indexOf('if (demoMode)'),
  );

  assert.match(registerBranch, /localIdentityReady:\s*localReady/);
  assert.match(registerBranch, /creatingProfile:\s*!localReady/);
  assert.doesNotMatch(registerBranch, /localIdentityReady:\s*true/);
  assert.match(template, /profile \|\| creatingProfile \|\| localIdentityReady \|\| registerMode/);
  assert.match(editor, /saveLocalIdentity\(identity\)[\s\S]*?localIdentityReady:\s*true/);
});

test('local contact controls describe the privacy behavior that sharing actually enforces', () => {
  const template = read('miniprogram/packageCard/pages/edit/index.wxml');

  assert.match(template, /localIdentityReady \|\| registerMode/);
  assert.match(template, /只控制当前设备上的本机名片预览/);
  assert.match(template, /不会进入微信分享卡片、接收页或海报/);
  assert.match(template, /分享时自动移除/);
});

test('local registration hides image controls that cannot persist across page exits', () => {
  const template = read('miniprogram/packageCard/pages/edit/index.wxml');

  assert.match(template, /wx:if="\{\{!localIdentityReady && !registerMode\}\}"[^>]*open-type="chooseAvatar"/);
  assert.match(template, /图片头像将在云端账户接入后开放/);
  assert.match(template, /wx:if="\{\{!localIdentityReady && !registerMode\}\}" class="card-editor-section"[\s\S]*?GALLERY/);
  assert.match(template, /wx:if="\{\{!localIdentityReady && !registerMode\}\}" class="card-editor-switch-row"[\s\S]*?显示图片/);
});

test('maximum local registration input fits the offline WeChat share path budget', async () => {
  const snapshot = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts');
  const built = snapshot.buildLocalIdentitySharePath({
    ...LOCAL_IDENTITY,
    displayName: '名'.repeat(24),
    profession: '职'.repeat(32),
    biography: '介'.repeat(72),
    selectedLabels: ['甲'.repeat(10), '乙'.repeat(10), '丙'.repeat(10), '丁'.repeat(10), '戊'.repeat(10)],
  }, 'champagne');
  const template = read('miniprogram/packageCard/pages/edit/index.wxml');

  assert.equal(built.ok, true);
  assert.ok(built.path.length <= snapshot.OFFLINE_DEMO_SHARE_PATH_BUDGET);
  assert.match(template, /maxlength="\{\{\(localIdentityReady \|\| registerMode\) \? 24 : 60\}\}"/);
  assert.match(template, /maxlength="\{\{\(localIdentityReady \|\| registerMode\) \? 32 : 80\}\}"/);
  assert.match(template, /maxlength="\{\{\(localIdentityReady \|\| registerMode\) \? 72 : 240\}\}"/);
});

test('local registration requires an explicit city instead of silently choosing the first one', () => {
  const editor = read('miniprogram/packageCard/pages/edit/index.ts');
  const localSaveBranch = editor.slice(
    editor.indexOf('if (this.data.localIdentityReady || this.data.registerMode)'),
    editor.indexOf('if (this.data.demoMode)'),
  );

  assert.match(localSaveBranch, /if \(!cityId\)[\s\S]*请选择所在城市/);
  assert.doesNotMatch(localSaveBranch, /cityId:\s*\(cityId \?\? CITY_DIRECTORY\[0\]\.id\)/);
});

test('cold-start card receiver distinguishes local input from synthetic demo evidence', () => {
  const receiver = read('miniprogram/pages/card-share/index.ts');
  const template = read('miniprogram/pages/card-share/index.wxml');

  assert.match(receiver, /options\.local === '1'/);
  assert.match(receiver, /snapshot\.source !== 'LOCAL'/);
  assert.match(receiver, /从本机转发的公开名片/);
  assert.match(template, /localIdentityMode/);
  assert.match(template, /本机名片 · 非云端账户/);
});
