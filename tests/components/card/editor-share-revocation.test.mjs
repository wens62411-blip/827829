import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

async function loadLiveEditorPage() {
  let definition;
  globalThis.Page = (candidate) => { definition = candidate; };
  const result = await build({
    stdin: {
      contents: `
        import './miniprogram/packageCard/pages/edit/index.ts';
        export { markShareRevokedForSession } from './miniprogram/pages/card/services/share-revocation-pointer.ts';
      `,
      resolveDir: root,
      sourcefile: 'editor-share-revocation-entry.ts',
      loader: 'ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'live-editor-identity-test-double',
      setup(api) {
        api.onResolve({ filter: /card\/services\/identity-client$/ }, () => ({ path: 'identity', namespace: 'live-editor' }));
        api.onLoad({ filter: /.*/, namespace: 'live-editor' }, () => ({
          loader: 'js',
          contents: `
            const hooks = () => globalThis.__AB_EDITOR_SHARE_TEST_HOOKS__;
            export const getRuntimeEvidence = () => ({ runtimeMode: 'LIVE', cloudConfigured: true });
            export const createCardShare = (...args) => hooks().createCardShare(...args);
            export const getMyPublicCard = (...args) => hooks().getMyPublicCard(...args);
            export const bootstrapIdentity = async () => ({ ok: false, message: 'not used' });
            export const getMyProfile = async () => ({ ok: false, message: 'not used' });
            export const refreshMyCard = async () => ({ ok: false, message: 'not used' });
            export const updateMyProfile = async () => ({ ok: false, message: 'not used' });
          `,
        }));
      },
    }],
  });
  const module = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Date.now()}-${Math.random()}`);
  assert.ok(definition);
  return { definition, markShareRevokedForSession: module.markShareRevokedForSession };
}

function instantiate(definition) {
  return {
    ...definition,
    data: structuredClone(definition.data),
    setData(patch) { Object.assign(this.data, patch); },
  };
}

test('editor stops forwarding its prepared token after entry management revokes it', async () => {
  const storage = new Map();
  const calls = [];
  const bearerA = `sc_${'R'.repeat(27)}`;
  const bearerB = `sc_${'S'.repeat(27)}`;
  const tokenIdA = 'share_synthetic_editor_revoked_A';
  const tokenIdB = 'share_synthetic_editor_revoked_B';
  const card = {
    cardId: 'card_synthetic_editor_revoked',
    ownerUserId: 'user_synthetic_editor_revoked',
    displayName: '隐私视角姓名',
    visibility: 'PUBLIC',
    claims: [],
    origin: 'SYNTHETIC',
    verificationState: 'USER_DECLARED',
    version: 4,
    createdAt: '2026-09-11T08:00:00.000Z',
    updatedAt: '2026-09-11T08:00:00.000Z',
  };
  globalThis.wx = {
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    removeStorageSync(key) { storage.delete(key); },
    hideShareMenu(input) { calls.push(['hideShareMenu', input]); },
    showShareMenu(input) { calls.push(['showShareMenu', input]); },
    showToast(input) { calls.push(['showToast', input]); },
    navigateTo(input) { calls.push(['navigateTo', input]); },
  };
  const queuedShares = [
    { shareTokenId: tokenIdA, token: bearerA },
    { shareTokenId: tokenIdB, token: bearerB },
  ];
  globalThis.__AB_EDITOR_SHARE_TEST_HOOKS__ = {
    getMyPublicCard: async () => ({ ok: true, data: { card } }),
    createCardShare: async () => {
      const share = queuedShares.shift();
      assert.ok(share);
      return {
        ok: true,
        data: {
          ...share,
          targetType: 'CARD',
          targetId: card.cardId,
          expiresAt: '2026-09-18T08:00:00.000Z',
        },
      };
    },
  };

  try {
    const { definition, markShareRevokedForSession } = await loadLiveEditorPage();
    const pageA = instantiate(definition);
    const pageB = instantiate(definition);
    for (const page of [pageA, pageB]) {
      page.editorPageUnloaded = false;
      page.data.demoMode = false;
      page.data.localIdentityReady = false;
      page.data.cardTheme = 'ink';
      assert.equal(await page.prepareDirectShare.call(page), true);
      assert.equal(page.data.shareReady, true);
    }
    assert.equal(pageA.onShareAppMessage.call(pageA).path, `/pages/card-share/index?token=${bearerA}&theme=ink`);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${bearerB}&theme=ink`);
    assert.equal(pageA.onShareAppMessage.call(pageA).title, 'AB Club 数字名片');

    pageA.openShareManager.call(pageA);
    assert.equal(calls.findLast(([name]) => name === 'navigateTo')?.[1].url, '/packageCard/pages/share/index');
    const registryKey = [...storage.keys()].find((key) => String(key).includes('last_share_revocation_pointer'));
    assert.ok(registryKey);
    const registry = structuredClone(storage.get(registryKey));
    storage.set(registryKey, {
      ...registry,
      pointers: registry.pointers.filter((entry) => entry.shareTokenId !== tokenIdA),
    });
    pageA.onShow.call(pageA);
    assert.equal(pageA.data.shareReady, true, 'only removing the local pointer must not impersonate a server revoke');
    assert.equal(pageA.onShareAppMessage.call(pageA).path, `/pages/card-share/index?token=${bearerA}&theme=ink`);

    markShareRevokedForSession(tokenIdA);
    pageA.onShow.call(pageA);
    assert.equal(pageA.data.shareReady, false);
    assert.equal(pageA.preparedSharePath, '');
    assert.equal(pageA.preparedShareTokenId, undefined);
    assert.match(pageA.data.shareMessage, /已在入口管理中撤销/);
    assert.equal(pageA.onShareAppMessage.call(pageA).path, '/pages/card-share/index?invalid=1');
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${bearerB}&theme=ink`);

    markShareRevokedForSession(tokenIdB);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, '/pages/card-share/index?invalid=1', 'share-time guard must work without onShow');
  } finally {
    delete globalThis.__AB_EDITOR_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});
