import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relativePath) => readFileSync(resolve(root, relativePath), 'utf8');

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
        buildApi.onResolve({ filter: /services\/native-share-card$/ }, () => ({ path: 'native-cover', namespace: 'card-cover-test' }));
        buildApi.onLoad({ filter: /.*/, namespace: 'card-cover-test' }, () => ({
          loader: 'js',
          contents: 'export const prepareNativeShareCardCover = (page, input) => globalThis.__AB_CARD_PAGE_TEST_HOOKS__.prepareCover?.(input) ?? Promise.resolve(undefined);',
        }));
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

test('owner edit and poster management navigate independently while direct share stays native', async () => {
  const navigations = [];
  globalThis.wx = {
    navigateTo(input) { navigations.push(input); },
  };
  globalThis.__AB_CARD_PAGE_TEST_HOOKS__ = {
    createCardShare: async () => ({ ok: false, message: 'not used' }),
    getMyCard: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadCardPage();
    const page = instantiate(definition);
    page.openEditor.call(page);
    page.openShareManager.call(page);
    assert.deepEqual(navigations, [
      { url: '/packageCard/pages/edit/index' },
      { url: '/packageCard/pages/share/index' },
    ]);

    const template = read('miniprogram/pages/card/index.wxml');
    const directShareButton = template.match(/<button[^>]*card-link-button--strong[^>]*>[\s\S]*?分享名片[\s\S]*?<\/button>/)?.[0];
    assert.ok(directShareButton, 'owner card needs a direct share control');
    assert.match(directShareButton, /open-type="share"/);
    assert.doesNotMatch(directShareButton, /bindtap=|navigateTo|url=/);
    assert.match(template, /bindtap="openShareManager"[^>]*>名片海报与入口管理/);
  } finally {
    delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('reload rejects stale personal covers and stale share readiness in either completion order', async () => {
  for (const oldCompletesFirst of [true, false]) {
    let identity = { displayName: '名片甲', profession: '设计', cityId: 'fr-paris', biography: '', selectedLabels: ['艺术'], showTags: true };
    const pending = [];
    const menus = [];
    globalThis.wx = {
      getStorageSync(key) { return key === 'ab.club.local-identity.v1' ? identity : null; },
      createSelectorQuery() {},
      hideShareMenu() {},
      showShareMenu(input) { menus.push(input); },
      showToast() {},
    };
    globalThis.__AB_CARD_PAGE_TEST_HOOKS__ = {
      prepareCover(input) { return new Promise((resolveCover) => pending.push({ input, resolveCover })); },
    };
    try {
      const page = instantiate(await loadCardPage());
      page.onLoad();
      const oldLoad = page.loadCard();
      assert.equal(pending[0].input.displayName, '名片甲');
      identity = { ...identity, displayName: '名片乙' };
      const newLoad = page.loadCard();
      assert.equal(pending[1].input.displayName, '名片乙');
      assert.equal(page.data.shareReady, false);
      if (oldCompletesFirst) {
        pending[0].resolveCover('wxfile://old-A.png');
        await oldLoad;
        assert.equal(page.data.shareReady, false, 'A must not enable the share button while B is pending');
        assert.equal(page.shareCoverPath, '', 'A must not install its stale cover');
      }
      pending[1].resolveCover('wxfile://current-B.png');
      await newLoad;
      if (!oldCompletesFirst) {
        pending[0].resolveCover('wxfile://old-A.png');
        await oldLoad;
      }
      assert.equal(page.data.card.displayName, '名片乙');
      assert.equal(page.data.shareReady, true);
      assert.equal(page.data.sharePreparing, false);
      assert.equal(page.shareCoverPath, 'wxfile://current-B.png');
      const payload = page.onShareAppMessage();
      assert.equal(payload.imageUrl, 'wxfile://current-B.png');
      const encoded = new URL(`https://local.test${payload.path}`).searchParams.get('snapshot');
      assert.match(Buffer.from(encoded.split('.')[0], 'base64url').toString('utf8'), /名片乙/);
      assert.equal(menus.length, 1, 'only B can enable native sharing');
    } finally {
      delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
      delete globalThis.Page;
      delete globalThis.wx;
    }
  }
});

test('slow share creation stays pending, de-duplicates taps, and cloud failure never becomes success', async () => {
  const storage = new Map();
  const wxCalls = [];
  globalThis.wx = {
    hideShareMenu(input) { wxCalls.push(['hideShareMenu', input]); },
    showShareMenu(input) { wxCalls.push(['showShareMenu', input]); },
    showToast(input) { wxCalls.push(['showToast', input]); },
    getStorageSync(key) { return structuredClone(storage.get(key)); },
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
    getStorageSync(key) { return structuredClone(storage.get(key)); },
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
    page.data.cardTheme = 'stone';
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
    const shareUrl = new URL(share.path, 'https://mini.program.test');
    assert.equal(shareUrl.pathname, '/pages/card-share/index');
    assert.deepEqual([...shareUrl.searchParams.keys()], ['token', 'theme']);
    assert.equal(shareUrl.searchParams.get('token'), bearer);
    assert.equal(shareUrl.searchParams.get('theme'), 'stone');
    assert.doesNotMatch(share.path, /ownerUserId|profile|permission|openid|phone/i);
    assert.equal(wxCalls.some(([name]) => name === 'showShareMenu'), true);
    assert.match(page.data.shareHint, /面板已请求打开/);
    assert.match(page.data.shareHint, /不会伪造.*分享成功/);
    page.onUnload.call(page);
  } finally {
    delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('owner card instances keep independent secrets and stop a token revoked in the manager', async () => {
  const storage = new Map();
  const wxCalls = [];
  const cardA = {
    cardId: 'card_synthetic_instance_A',
    ownerUserId: 'user_synthetic_instance_A',
    displayName: '实例 A',
    visibility: 'PUBLIC',
    claims: [],
    origin: 'SYNTHETIC',
    verificationState: 'USER_DECLARED',
    version: 1,
    createdAt: '2026-09-11T08:00:00.000Z',
    updatedAt: '2026-09-11T08:00:00.000Z',
  };
  const cardB = { ...cardA, cardId: 'card_synthetic_instance_B', ownerUserId: 'user_synthetic_instance_B', displayName: '实例 B' };
  const bearerA = `sc_${'M'.repeat(27)}`;
  const bearerB = `sc_${'N'.repeat(27)}`;
  const tokenIdA = 'share_synthetic_instance_A';
  const tokenIdB = 'share_synthetic_instance_B';
  globalThis.wx = {
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    removeStorageSync(key) { storage.delete(key); },
    hideShareMenu(input) { wxCalls.push(['hideShareMenu', input]); },
    showShareMenu(input) { wxCalls.push(['showShareMenu', input]); },
    showToast(input) { wxCalls.push(['showToast', input]); },
  };
  globalThis.__AB_CARD_PAGE_TEST_HOOKS__ = {
    createCardShare: async (cardId) => ({
      ok: true,
      data: {
        shareTokenId: cardId === cardA.cardId ? tokenIdA : tokenIdB,
        token: cardId === cardA.cardId ? bearerA : bearerB,
        targetType: 'CARD',
        targetId: cardId,
        expiresAt: '2026-09-18T08:00:00.000Z',
      },
    }),
    getMyCard: async () => ({ ok: false, code: 'NOT_FOUND', message: 'not used' }),
    revokeCardShare: async (shareTokenId) => ({ ok: true, data: { shareTokenId } }),
  };

  try {
    const definition = await loadCardPage();
    const pageA = instantiate(definition);
    const pageB = instantiate(definition);
    pageA.data.card = cardA;
    pageB.data.card = cardB;
    await Promise.all([pageA.prepareWechatShare.call(pageA), pageB.prepareWechatShare.call(pageB)]);

    assert.equal(pageA.onShareAppMessage.call(pageA).path, `/pages/card-share/index?token=${bearerA}`);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${bearerB}`);

    const registryKey = [...storage.keys()].find((key) => String(key).includes('last_share_revocation_pointer'));
    assert.ok(registryKey);
    const registry = structuredClone(storage.get(registryKey));
    storage.set(registryKey, {
      ...registry,
      pointers: registry.pointers.filter((entry) => entry.shareTokenId !== tokenIdA),
    });
    assert.equal(
      pageA.onShareAppMessage.call(pageA).path,
      `/pages/card-share/index?token=${bearerA}`,
      'removing only the local pointer must not pretend the server token was revoked',
    );

    const revoker = instantiate(definition);
    revoker.data.card = cardA;
    revoker.data.shareReady = true;
    revoker.activeShare = { token: bearerA, shareTokenId: tokenIdA };
    await revoker.revokePreparedShare.call(revoker);
    pageA.onShow.call(pageA);
    assert.equal(pageA.data.shareReady, false);
    assert.match(pageA.data.shareHint, /已在入口管理中撤销/);
    assert.equal(pageA.onShareAppMessage.call(pageA).path, '/pages/card-share/index?invalid=1');
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${bearerB}`);
    assert.equal(storage.get(registryKey).pointers.some((entry) => entry.shareTokenId === tokenIdB), true);
  } finally {
    delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('a share response arriving after owner-card unload cannot install or persist a bearer', async () => {
  const storage = new Map();
  let settleCreate;
  const createPending = new Promise((resolvePromise) => { settleCreate = resolvePromise; });
  globalThis.wx = {
    hideShareMenu() {},
    showShareMenu() {},
    showToast() {},
    getStorageSync(key) { return structuredClone(storage.get(key)); },
    setStorageSync(key, value) { storage.set(key, structuredClone(value)); },
    removeStorageSync(key) { storage.delete(key); },
  };
  globalThis.__AB_CARD_PAGE_TEST_HOOKS__ = {
    createCardShare: async () => createPending,
    getMyCard: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadCardPage();
    let postUnloadWrites = 0;
    const page = {
      ...definition,
      data: structuredClone(definition.data),
      setData(patch) {
        if (this.cardPageUnloaded) postUnloadWrites += 1;
        Object.assign(this.data, patch);
      },
    };
    page.data.card = {
      cardId: 'card_synthetic_late_owner_001',
      ownerUserId: 'user_synthetic_late_owner_001',
      displayName: '离页竞态测试',
      visibility: 'PUBLIC',
      claims: [],
      origin: 'SYNTHETIC',
      verificationState: 'USER_DECLARED',
      version: 1,
      createdAt: '2026-09-11T08:00:00.000Z',
      updatedAt: '2026-09-11T08:00:00.000Z',
    };

    const pending = page.prepareWechatShare.call(page);
    await Promise.resolve();
    page.onUnload.call(page);
    settleCreate({
      ok: true,
      data: {
        shareTokenId: 'share_synthetic_late_owner_001',
        token: `sc_${'L'.repeat(27)}`,
        targetType: 'CARD',
        targetId: 'card_synthetic_late_owner_001',
        expiresAt: '2026-09-18T08:00:00.000Z',
      },
    });
    await pending;

    assert.equal(postUnloadWrites, 0);
    assert.equal(storage.size, 0);
    assert.equal(page.data.shareReady, false);
  } finally {
    delete globalThis.__AB_CARD_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});
