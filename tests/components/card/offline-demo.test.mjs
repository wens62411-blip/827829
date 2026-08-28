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
  assert.match(demo.OFFLINE_DEMO_CARD.biography, /合成资料|不对应任何真实用户/);
  assert.equal(JSON.stringify(demo.OFFLINE_DEMO_REVIEW_ITEMS).includes('APPROVED'), false);
  assert.equal(JSON.stringify(demo.OFFLINE_DEMO_REVIEW_ITEMS).includes('HUMAN_REVIEWED'), false);
  assert.equal(demo.isOfflineDemo({ runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false }), true);
  assert.equal(demo.isOfflineDemo({ runtimeMode: 'LIVE', cloudConfigured: true }), false);
});

test('offline card surfaces label state, editable preview, and explicitly labelled native sharing', () => {
  const cardSource = read('miniprogram/pages/card/index.ts');
  const meSource = read('miniprogram/pages/me/index.ts');
  const identitySource = read('miniprogram/pages/card/services/identity-client.ts');
  const cardPage = read('miniprogram/pages/card/index.wxml');
  const mePage = read('miniprogram/pages/me/index.wxml');
  const editSource = read('miniprogram/packageCard/pages/edit/index.ts');
  const shareSource = read('miniprogram/packageCard/pages/share/index.ts');
  const sharePage = read('miniprogram/packageCard/pages/share/index.wxml');

  for (const source of [cardPage, mePage, sharePage]) assert.match(source, /SYNTHETIC · DEMO_ONLY/);
  assert.match(cardPage, /标签必须先经过人工审核/);
  assert.match(mePage, /公开标签状态/);
  assert.match(editSource, /已保存到本机[\s\S]*?DEMO_ONLY[\s\S]*?未写入云端/);
  assert.match(shareSource, /未创建分享：[\s\S]*?OFFLINE_DEMO/);
  assert.match(shareSource, /SYNTHETIC · DEMO_ONLY[\s\S]*?drawPublicPoster\(canvas, posterCard, this\.data\.demoMode\)/);
  assert.match(sharePage, /<button\b[^>]*open-type="share"[^>]*>/);
  assert.match(sharePage, /微信转发和本地海报可以实际操作/);
  assert.match(sharePage, /不会产生真实会员、审核或人脉记录/);
  assert.doesNotMatch(sharePage, /demoMode[^\n]*分享成功/);
  for (const source of [cardSource, meSource]) {
    assert.doesNotMatch(source, /^import\s+\{[^\n]*\}\s+from\s+['"][^'"]*identity-client['"]/m);
    assert.match(source, /type IdentityClientModule = typeof import\(/);
    assert.match(source, /return require\(/);
  }
  assert.match(identitySource, /from '\.\.\/\.\.\/\.\.\/shared\/services\/cloud-client'/);
  assert.doesNotMatch(identitySource, /from '\.\.\/\.\.\/\.\.\/shared\/services'/);
});
