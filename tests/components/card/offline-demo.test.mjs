import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

async function loadDemo() {
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/pages/card/services/offline-demo.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Date.now()}`);
}

test('offline fixtures are visibly synthetic and never fabricate approval', async () => {
  const demo = await loadDemo();
  assert.equal(demo.OFFLINE_DEMO_CARD.origin, 'SYNTHETIC');
  assert.equal(demo.OFFLINE_DEMO_CARD.verificationState, 'USER_DECLARED');
  assert.deepEqual(demo.OFFLINE_DEMO_CARD.claims, []);
  assert.match(demo.OFFLINE_DEMO_CARD.displayName, /示例/);
  assert.ok(demo.OFFLINE_DEMO_CARD.biography.length > 0);
  assert.doesNotMatch(demo.OFFLINE_DEMO_CARD.biography, /审核流程|预览数字名片/);
  assert.equal(JSON.stringify(demo.OFFLINE_DEMO_REVIEW_ITEMS).includes('APPROVED'), false);
  assert.equal(JSON.stringify(demo.OFFLINE_DEMO_REVIEW_ITEMS).includes('HUMAN_REVIEWED'), false);
  assert.equal(demo.isOfflineDemo({ runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false }), true);
  assert.equal(demo.isOfflineDemo({ runtimeMode: 'LIVE', cloudConfigured: true }), false);
});

test('offline card surfaces keep runtime boundaries internally and expose concise customer actions', () => {
  const cardSource = read('miniprogram/pages/card/index.ts');
  const meSource = read('miniprogram/pages/me/index.ts');
  const identitySource = read('miniprogram/pages/card/services/identity-client.ts');
  const cardPage = read('miniprogram/pages/card/index.wxml');
  const mePage = read('miniprogram/pages/me/index.wxml');
  const editSource = read('miniprogram/packageCard/pages/edit/index.ts');
  const shareSource = read('miniprogram/packageCard/pages/share/index.ts');
  const sharePage = read('miniprogram/packageCard/pages/share/index.wxml');

  for (const source of [cardPage, sharePage]) {
    assert.doesNotMatch(source, /本机预览|此设备保存的名片|当前为合成示例|体验版|DEMO_ONLY|仅供预览/);
  }
  assert.doesNotMatch(mePage, /体验版|DEMO_ONLY|示例内容/);
  assert.match(meSource, /materializeLocalIdentityProfile/);
  assert.doesNotMatch(meSource, /OFFLINE_DEMO_PROFILE|readOfflineDemoDraft/);
  assert.match(editSource, /writeOfflineDemoDraft\(draft\)/);
  assert.match(shareSource, /if \(this\.data\.demoMode\) \{[\s\S]*?return;/);
  assert.match(sharePage, /bindtap="generatePoster"/);
  assert.match(sharePage, /bindtap="savePosterToAlbum"/);
  assert.match(cardPage, /<button\b[^>]*open-type="share"[^>]*>/);
  assert.doesNotMatch(sharePage, /demoMode[^\n]*分享成功/);
  for (const source of [cardSource, meSource]) {
    assert.doesNotMatch(source, /^import\s+\{[^\n]*\}\s+from\s+['"][^'"]*identity-client['"]/m);
    assert.match(source, /type IdentityClientModule = typeof import\(/);
    assert.match(source, /return require\(/);
  }
  assert.match(identitySource, /from '\.\.\/\.\.\/\.\.\/shared\/services\/cloud-client'/);
  assert.doesNotMatch(identitySource, /from '\.\.\/\.\.\/\.\.\/shared\/services'/);
});
