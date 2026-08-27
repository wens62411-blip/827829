import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

async function loadCardPage() {
  let definition;
  globalThis.Page = (candidate) => { definition = candidate; };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/pages/card/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'identity-client-test-double',
      setup(buildApi) {
        buildApi.onResolve({ filter: /services\/identity-client$/ }, () => ({
          path: 'identity-client',
          namespace: 'card-test',
        }));
        buildApi.onLoad({ filter: /.*/, namespace: 'card-test' }, () => ({
          loader: 'js',
          contents: `
            const hooks = () => globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
            export const createCardShare = (...args) => hooks().createCardShare(...args);
            export const getMyCard = (...args) => hooks().getMyCard(...args);
            export const revokeCardShare = (...args) => hooks().revokeCardShare(...args);
            export const getRuntimeEvidence = () => ({ runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false });
          `,
        }));
      },
    }],
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Date.now()}-${Math.random()}`);
  assert.ok(definition, 'Page definition was not registered');
  return definition;
}

function instantiate(definition) {
  return {
    ...definition,
    data: structuredClone(definition.data),
    setData(patch) { Object.assign(this.data, patch); },
  };
}

test('slow share creation stays pending, de-duplicates taps, and cloud failure never becomes success', async () => {
  const storage = new Map();
  const wxCalls = [];
  globalThis.wx = {
    hideShareMenu(input) { wxCalls.push(['hideShareMenu', input]); },
    showShareMenu(input) { wxCalls.push(['showShareMenu', input]); },
    showToast(input) { wxCalls.push(['showToast', input]); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    removeStorageSync(key) { storage.delete(key); },
  };

  let createCalls = 0;
  let settleCreate;
  globalThis.__AB_CARD_PAGE_TEST_HOOKS__ = {
    createCardShare() {
      createCalls += 1;
      return new Promise((resolvePromise) => { settleCreate = resolvePromise; });
    },
    getMyCard: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadCardPage();
    const page = instantiate(definition);
    page.data.card = {
      cardId: 'card_synthetic_resilience_001',
      ownerUserId: 'user_synthetic_resilience_001',
      displayName: '合成慢网测试',
      visibility: 'PUBLIC',
      claims: [],
      origin: 'SYNTHETIC',
      verificationState: 'USER_DECLARED',
      version: 3,
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    };

    const first = page.prepareWechatShare.call(page);
    await Promise.resolve();
    assert.equal(page.data.sharePreparing, true);
    assert.equal(page.data.shareReady, false);
    await page.prepareWechatShare.call(page);
    assert.equal(createCalls, 1);

    settleCreate({
      ok: false,
      kind: 'API',
      code: 'SERVICE_UNAVAILABLE',
      message: '云函数暂时不可用。',
      retryable: true,
      requestId: 'req_synthetic_failure_001',
    });
    await first;
    assert.equal(page.data.sharePreparing, false);
    assert.equal(page.data.shareReady, false);
    assert.match(page.data.shareHint, /云函数暂时不可用/);
    assert.equal(storage.size, 0);
    assert.equal(wxCalls.some(([name]) => name === 'showShareMenu'), false);
  } finally {
    delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('successful response keeps the bearer only in memory and emits a token-only share query', async () => {
  const storage = new Map();
  const wxCalls = [];
  const bearer = `sc_${'A'.repeat(27)}`;
  globalThis.wx = {
    hideShareMenu(input) { wxCalls.push(['hideShareMenu', input]); },
    showShareMenu(input) { wxCalls.push(['showShareMenu', input]); },
    showToast(input) { wxCalls.push(['showToast', input]); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    removeStorageSync(key) { storage.delete(key); },
  };
  let createCalls = 0;
  globalThis.__AB_CARD_PAGE_TEST_HOOKS__ = {
    createCardShare: async (cardId) => {
      createCalls += 1;
      return {
        ok: true,
        requestId: 'req_synthetic_success_001',
        platformRequestId: undefined,
        data: {
          shareTokenId: 'share_synthetic_pointer_001',
          token: bearer,
          targetType: 'CARD',
          targetId: cardId,
          expiresAt: '2026-09-03T08:00:00.000Z',
        },
      };
    },
    getMyCard: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadCardPage();
    const page = instantiate(definition);
    page.data.card = {
      cardId: 'card_synthetic_share_001',
      ownerUserId: 'user_synthetic_share_001',
      displayName: '合成分享测试',
      visibility: 'PUBLIC',
      claims: [],
      origin: 'SYNTHETIC',
      verificationState: 'USER_DECLARED',
      version: 1,
      createdAt: '2026-08-27T08:00:00.000Z',
      updatedAt: '2026-08-27T08:00:00.000Z',
    };
    await Promise.all([
      page.prepareWechatShare.call(page),
      page.prepareWechatShare.call(page),
    ]);
    assert.equal(createCalls, 1);
    assert.equal(page.data.shareReady, true);
    const persisted = JSON.stringify([...storage.values()]);
    assert.equal(persisted.includes(bearer), false);
    assert.match(persisted, /share_synthetic_pointer_001/);

    const share = page.onShareAppMessage.call(page);
    assert.equal(share.path, `/pages/card-share/index?token=${bearer}`);
    assert.doesNotMatch(share.path, /ownerUserId|profile|permission|openid|phone/i);
    assert.equal(wxCalls.some(([name]) => name === 'showShareMenu'), true);
    page.onUnload.call(page);
  } finally {
    delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});
