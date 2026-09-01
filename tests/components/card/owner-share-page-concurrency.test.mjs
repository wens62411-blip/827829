import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => { resolvePromise = resolveValue; });
  return { promise, resolve: resolvePromise };
}

function cardResult(label) {
  return {
    ok: true,
    requestId: `req_synthetic_card_${label}`,
    platformRequestId: undefined,
    data: {
      card: {
        cardId: `card_synthetic_owner_${label}`,
        ownerUserId: `user_synthetic_owner_${label}`,
        displayName: `合成所有者 ${label}`,
        headline: `合成职业 ${label}`,
        cityId: 'ch-zurich',
        biography: '仅用于本地并发测试的合成公开投影。',
        visibility: 'PUBLIC',
        claims: [],
        origin: 'SYNTHETIC',
        verificationState: 'USER_DECLARED',
        version: 1,
        createdAt: '2026-08-28T08:00:00.000Z',
        updatedAt: '2026-08-28T08:00:00.000Z',
      },
    },
  };
}

async function loadOwnerSharePage() {
  let definition;
  globalThis.Page = (candidate) => { definition = candidate; };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/packageCard/pages/share/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'owner-share-test-doubles',
      setup(buildApi) {
        buildApi.onResolve({ filter: /card\/services\/identity-client$/ }, () => ({
          path: 'identity-client',
          namespace: 'owner-share-test',
        }));
        buildApi.onLoad({ filter: /identity-client/, namespace: 'owner-share-test' }, () => ({
          loader: 'js',
          contents: `
            const hooks = () => globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
            export const getRuntimeEvidence = () => hooks().runtimeEvidence
              ?? ({ runtimeMode: 'LIVE', cloudConfigured: true });
            export const getMyPublicCard = (...args) => hooks().getMyPublicCard(...args);
            export const createCardShare = (...args) => hooks().createCardShare(...args);
            export const createCardQrScene = (...args) => hooks().createCardQrScene(...args);
            export const revokeCardShare = (...args) => hooks().revokeCardShare(...args);
          `,
        }));
        buildApi.onResolve({ filter: /card\/services\/share-revocation-pointer$/ }, () => ({
          path: 'share-revocation-pointer',
          namespace: 'owner-share-test',
        }));
        buildApi.onLoad({ filter: /share-revocation-pointer/, namespace: 'owner-share-test' }, () => ({
          loader: 'js',
          contents: `
            const hooks = () => globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
            export const isSafeShareTokenId = (value) => typeof value === 'string'
              && value.length >= 3 && value.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(value);
            export const readShareRevocationPointer = () => hooks().revocationPointer;
            export const rememberShareForRevocation = (tokenId) => {
              hooks().revocationPointer = tokenId;
              hooks().remembered.push(tokenId);
              return true;
            };
            export const forgetShareRevocationPointer = () => {
              hooks().revocationPointer = undefined;
              hooks().forgotten += 1;
            };
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
    setData(patch, callback) {
      Object.assign(this.data, patch);
      callback?.();
    },
  };
}

function createCanvas(label) {
  const context = {
    scale() {},
    fillRect() {},
    fillText() {},
    beginPath() {},
    arc() {},
    fill() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    strokeRect() {},
    save() {},
    restore() {},
    createLinearGradient() { return { addColorStop() {} }; },
    measureText(text) { return { width: String(text).length * 10 }; },
  };
  return { label, width: 0, height: 0, getContext: () => context };
}

function installWx(cardTheme, localIdentity) {
  const calls = [];
  const savedPaths = [];
  globalThis.wx = {
    getStorageSync(key) {
      return key === 'ab.club.local-identity.v1' ? localIdentity : cardTheme;
    },
    hideShareMenu(input) { calls.push(['hideShareMenu', input]); },
    showShareMenu(input) { calls.push(['showShareMenu', input]); },
    showToast(input) { calls.push(['showToast', input]); },
    showModal(input) { calls.push(['showModal', input]); },
    nextTick(callback) { queueMicrotask(callback); },
    getWindowInfo() { return { pixelRatio: 1 }; },
    createSelectorQuery() {
      let page;
      let callback;
      return {
        in(value) { page = value; return this; },
        select() { return this; },
        node(value) { callback = value; return this; },
        exec() { callback({ node: page.canvasForTest }); },
      };
    },
    canvasToTempFilePath(input) {
      input.success({ tempFilePath: `tmp://${input.canvas.label}.png` });
    },
    getSetting(input) { input.success({ authSetting: { 'scope.writePhotosAlbum': true } }); },
    authorize(input) { input.success(); },
    saveImageToPhotosAlbum(input) {
      savedPaths.push(input.filePath);
      input.success();
    },
    openSetting(input) { input.success({ authSetting: { 'scope.writePhotosAlbum': true } }); },
  };
  return { calls, savedPaths };
}

async function settle() {
  await new Promise((resolvePromise) => setImmediate(resolvePromise));
}

test('two owner share pages keep cards, bearer secrets and revocation state isolated', async () => {
  installWx();
  const loads = [Promise.resolve(cardResult('A')), Promise.resolve(cardResult('B'))];
  const createCalls = [];
  const tokenA = `sc_${'A'.repeat(27)}`;
  const tokenB = `sc_${'B'.repeat(27)}`;
  globalThis.__AB_OWNER_SHARE_TEST_HOOKS__ = {
    revocationPointer: undefined,
    remembered: [],
    forgotten: 0,
    getMyPublicCard: () => loads.shift(),
    createCardShare: async (cardId) => {
      createCalls.push(cardId);
      const isA = cardId.endsWith('_A');
      return {
        ok: true,
        data: {
          targetType: 'CARD',
          targetId: cardId,
          shareTokenId: isA ? 'share_owner_A' : 'share_owner_B',
          token: isA ? tokenA : tokenB,
        },
      };
    },
    createCardQrScene: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async (shareTokenId) => ({ ok: true, data: { shareTokenId } }),
  };

  try {
    const definition = await loadOwnerSharePage();
    const pageA = instantiate(definition);
    const pageB = instantiate(definition);
    pageA.onLoad.call(pageA);
    pageB.onLoad.call(pageB);
    await settle();

    assert.equal(pageA.data.card.displayName, '合成所有者 A');
    assert.equal(pageB.data.card.displayName, '合成所有者 B');
    await Promise.all([pageA.createShare.call(pageA), pageB.createShare.call(pageB)]);
    assert.deepEqual(createCalls.sort(), [
      'card_synthetic_owner_A',
      'card_synthetic_owner_B',
    ]);
    assert.equal(pageA.onShareAppMessage.call(pageA).path, `/pages/card-share/index?token=${tokenA}`);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${tokenB}`);

    assert.equal(globalThis.__AB_OWNER_SHARE_TEST_HOOKS__.revocationPointer, 'share_owner_B');
    await pageA.revokeShare.call(pageA);
    assert.equal(pageA.data.shareState, 'REVOKED');
    assert.equal(pageB.data.shareState, 'SUCCESS');
    assert.equal(globalThis.__AB_OWNER_SHARE_TEST_HOOKS__.revocationPointer, 'share_owner_B');
    assert.equal(globalThis.__AB_OWNER_SHARE_TEST_HOOKS__.forgotten, 0);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${tokenB}`);
  } finally {
    delete globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('a slower re-entrant card load cannot overwrite the latest public projection', async () => {
  installWx();
  const first = deferred();
  const second = deferred();
  const loads = [first.promise, second.promise];
  globalThis.__AB_OWNER_SHARE_TEST_HOOKS__ = {
    revocationPointer: undefined,
    remembered: [],
    forgotten: 0,
    getMyPublicCard: () => loads.shift(),
    createCardShare: async () => ({ ok: false, message: 'not used' }),
    createCardQrScene: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadOwnerSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page);
    const latestPending = page.loadCard.call(page);
    second.resolve(cardResult('latest'));
    await latestPending;
    first.resolve(cardResult('stale'));
    await settle();

    assert.equal(page.data.card.displayName, '合成所有者 latest');
    assert.equal(page.activeCard.displayName, '合成所有者 latest');
  } finally {
    delete globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('a create response arriving after unload cannot install or persist its bearer', async () => {
  const { calls } = installWx();
  const pendingCreate = deferred();
  const token = `sc_${'U'.repeat(27)}`;
  globalThis.__AB_OWNER_SHARE_TEST_HOOKS__ = {
    revocationPointer: undefined,
    remembered: [],
    forgotten: 0,
    getMyPublicCard: async () => cardResult('unload'),
    createCardShare: () => pendingCreate.promise,
    createCardQrScene: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadOwnerSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page);
    await settle();
    const pending = page.createShare.call(page);
    page.onUnload.call(page);
    pendingCreate.resolve({
      ok: true,
      data: {
        targetType: 'CARD',
        targetId: 'card_synthetic_owner_unload',
        shareTokenId: 'share_owner_unload',
        token,
      },
    });
    await pending;

    assert.equal(page.activeShareSecret, undefined);
    assert.equal(globalThis.__AB_OWNER_SHARE_TEST_HOOKS__.revocationPointer, undefined);
    assert.deepEqual(globalThis.__AB_OWNER_SHARE_TEST_HOOKS__.remembered, []);
    assert.notEqual(page.data.shareState, 'SUCCESS');
    assert.equal(calls.filter(([name]) => name === 'showShareMenu').length, 0);
    assert.equal(page.onShareAppMessage.call(page).path, '/pages/card/index');
  } finally {
    delete globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('one page unloading cannot clear another page canvas or block its album save', async () => {
  const { savedPaths } = installWx();
  const loads = [
    Promise.resolve(cardResult('A')),
    Promise.resolve(cardResult('B')),
    Promise.resolve(cardResult('A-poster')),
    Promise.resolve(cardResult('B-poster')),
  ];
  globalThis.__AB_OWNER_SHARE_TEST_HOOKS__ = {
    revocationPointer: undefined,
    remembered: [],
    forgotten: 0,
    getMyPublicCard: () => loads.shift(),
    createCardShare: async () => ({ ok: false, message: 'not used' }),
    createCardQrScene: async () => ({ ok: false, message: 'not used' }),
    revokeCardShare: async () => ({ ok: false, message: 'not used' }),
  };

  try {
    const definition = await loadOwnerSharePage();
    const pageA = instantiate(definition);
    const pageB = instantiate(definition);
    pageA.canvasForTest = createCanvas('A');
    pageB.canvasForTest = createCanvas('B');
    pageA.onLoad.call(pageA);
    pageB.onLoad.call(pageB);
    await settle();

    await Promise.all([pageA.generatePoster.call(pageA), pageB.generatePoster.call(pageB)]);
    assert.equal(pageA.data.posterPath, 'tmp://A.png');
    assert.equal(pageB.data.posterPath, 'tmp://B.png');
    pageB.onUnload.call(pageB);
    await pageA.savePosterToAlbum.call(pageA);

    assert.deepEqual(savedPaths, ['tmp://A.png']);
    assert.equal(pageA.data.posterMessage, '微信已确认图片保存到相册。');
  } finally {
    delete globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('first-time offline users must establish their own card before sharing', async () => {
  const { calls } = installWx('ink');
  let cloudReads = 0;
  globalThis.__AB_OWNER_SHARE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false },
    revocationPointer: undefined,
    remembered: [],
    forgotten: 0,
    getMyPublicCard: async () => {
      cloudReads += 1;
      return cardResult('unexpected');
    },
    createCardShare: async () => { throw new Error('demo must not create a cloud share'); },
    createCardQrScene: async () => { throw new Error('demo must not create a QR scene'); },
    revokeCardShare: async () => { throw new Error('demo must not revoke a cloud share'); },
  };

  try {
    const definition = await loadOwnerSharePage();
    const page = instantiate(definition);
    page.canvasForTest = createCanvas('demo');
    page.onLoad.call(page);
    await settle();

    assert.equal(page.data.demoMode, true);
    assert.equal(page.data.localIdentityReady, false);
    assert.equal(page.data.card, null);
    assert.match(page.data.pageError, /请先建立自己的名片/);
    assert.equal(page.data.localNotice, '');
    assert.equal(calls.filter(([name]) => name === 'showShareMenu').length, 0);
    assert.equal(cloudReads, 0, 'first-time offline sharing must not read from cloud');

    const fallbackShare = page.onShareAppMessage.call(page);
    assert.equal(fallbackShare.path, '/pages/card/index');
    assert.doesNotMatch(JSON.stringify(fallbackShare), /林知遥|demo@|\+41/);
  } finally {
    delete globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('offline owner share prefers the registered local identity and exports no private contacts', async () => {
  const localIdentity = {
    contractVersion: 1,
    displayName: '本机填写者',
    biography: '',
    profession: '独立策展人',
    cityId: 'cn-shenzhen',
    selectedLabels: ['策展', '珠宝'],
    showTags: true,
    phone: '+86 138 0013 8000',
    email: 'private@example.com',
    showPhone: true,
    showEmail: true,
    registeredAt: '2026-08-31T08:00:00.000Z',
  };
  installWx('stone', localIdentity);
  let cloudReads = 0;
  globalThis.__AB_OWNER_SHARE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false },
    revocationPointer: undefined,
    remembered: [],
    forgotten: 0,
    getMyPublicCard: async () => {
      cloudReads += 1;
      return cardResult('unexpected');
    },
    createCardShare: async () => { throw new Error('local identity must not create a cloud share'); },
    createCardQrScene: async () => { throw new Error('local identity must not create a QR scene'); },
    revokeCardShare: async () => { throw new Error('local identity must not revoke a cloud share'); },
  };

  try {
    const definition = await loadOwnerSharePage();
    const page = instantiate(definition);
    page.canvasForTest = createCanvas('local');
    page.onLoad.call(page);
    await settle();

    assert.equal(cloudReads, 0);
    assert.equal(page.data.localIdentityReady, true);
    assert.equal(page.data.card.displayName, localIdentity.displayName);
    assert.equal(page.data.card.biography, '');
    assert.deepEqual(page.data.demoFields, [{ key: 'profession', label: '职业', value: '独立策展人' }]);
    assert.doesNotMatch(JSON.stringify(page.data), /138 0013 8000|private@example\.com|AB Atelier|合成示例/);
    const sharePath = page.onShareAppMessage.call(page).path;
    assert.match(sharePath, /^\/pages\/card-share\/index\?local=1&snapshot=/);
    assert.doesNotMatch(sharePath, /138|private|example/);
  } finally {
    delete globalThis.__AB_OWNER_SHARE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});
