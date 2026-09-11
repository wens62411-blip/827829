import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

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

function deferred() {
  let resolvePromise;
  const promise = new Promise((resolveValue) => { resolvePromise = resolveValue; });
  return { promise, resolve: resolvePromise };
}

async function loadCardSharePage() {
  let definition;
  globalThis.Page = (candidate) => { definition = candidate; };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/pages/card-share/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'identity-client-test-double',
      setup(buildApi) {
        buildApi.onResolve({ filter: /card\/services\/identity-client$/ }, () => ({
          path: 'identity-client',
          namespace: 'card-share-test',
        }));
        buildApi.onLoad({ filter: /.*/, namespace: 'card-share-test' }, () => ({
          loader: 'js',
          contents: `
            const hooks = () => globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
            export const resolveCardShare = (...args) => hooks().resolveCardShare(...args);
            export const getMyCard = (...args) => hooks().getMyCard
              ? hooks().getMyCard(...args)
              : Promise.resolve({ ok: false, code: 'NOT_FOUND', message: 'not found' });
            export const getRuntimeEvidence = () => hooks().runtimeEvidence
              ?? ({ runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false });
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

function success(referenceLabel) {
  const cardId = `card_synthetic_${referenceLabel}`;
  return {
    ok: true,
    requestId: `req_synthetic_${referenceLabel}`,
    platformRequestId: undefined,
    data: {
      resolution: {
        tokenId: `share_synthetic_${referenceLabel}`,
        resolvedAt: '2026-08-28T08:00:00.000Z',
        revoked: false,
        targetType: 'CARD',
        targetId: cardId,
        card: {
          cardId,
          ownerUserId: `user_synthetic_${referenceLabel}`,
          displayName: `合成名片 ${referenceLabel}`,
          cityId: 'ch-zurich',
          visibility: 'PUBLIC',
          claims: [],
          origin: 'SYNTHETIC',
          verificationState: 'USER_DECLARED',
          version: 1,
          createdAt: '2026-08-28T08:00:00.000Z',
          updatedAt: '2026-08-28T08:00:00.000Z',
        },
      },
    },
  };
}

function installWx(storageValue = null) {
  const calls = [];
  globalThis.wx = {
    getStorageSync() { return storageValue; },
    hideShareMenu(input) { calls.push(['hideShareMenu', input]); },
    showShareMenu(input) { calls.push(['showShareMenu', input]); },
    setNavigationBarTitle(input) { calls.push(['setNavigationBarTitle', input]); },
    navigateTo(input) { calls.push(['navigateTo', input]); },
    showToast(input) { calls.push(['showToast', input]); },
    stopPullDownRefresh() { calls.push(['stopPullDownRefresh']); },
  };
  return calls;
}

test('two card-share page instances resolve and forward only their own bearer', async () => {
  const tokenA = `sc_${'A'.repeat(27)}`;
  const tokenB = `sc_${'B'.repeat(27)}`;
  const requests = new Map([[tokenA, deferred()], [tokenB, deferred()]]);
  const seen = [];
  installWx();
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    resolveCardShare(reference) {
      const bearer = reference.token ?? reference.scene;
      seen.push(bearer);
      return requests.get(bearer).promise;
    },
  };

  try {
    const definition = await loadCardSharePage();
    const pageA = instantiate(definition);
    const pageB = instantiate(definition);
    pageA.onLoad.call(pageA, { token: tokenA });
    pageB.onLoad.call(pageB, { token: tokenB });

    const pendingA = pageA.resolveShare.call(pageA);
    const pendingB = pageB.resolveShare.call(pageB);
    await Promise.resolve();
    assert.deepEqual(seen.sort(), [tokenA, tokenB].sort());

    requests.get(tokenB).resolve(success('B'));
    await pendingB;
    requests.get(tokenA).resolve(success('A'));
    await pendingA;

    assert.equal(pageA.data.card.displayName, '合成名片 A');
    assert.equal(pageB.data.card.displayName, '合成名片 B');
    assert.equal(pageA.onShareAppMessage.call(pageA).title, 'AB Club 数字名片');
    assert.equal(pageB.onShareAppMessage.call(pageB).title, 'AB Club 数字名片');
    assert.doesNotMatch(pageA.onShareAppMessage.call(pageA).title, /合成名片 A/);
    assert.doesNotMatch(pageB.onShareAppMessage.call(pageB).title, /合成名片 B/);
    assert.equal(pageA.onShareAppMessage.call(pageA).path, `/pages/card-share/index?token=${tokenA}`);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${tokenB}`);
    assert.equal(pageA.onShareAppMessage.call(pageA).imageUrl, '/assets/brand/ab-club-brand-share.jpg');
    assert.equal(pageB.onShareAppMessage.call(pageB).imageUrl, '/assets/brand/ab-club-brand-share.jpg');
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('a stale resolution cannot overwrite a newer reference on the same instance', async () => {
  const tokenA = `sc_${'C'.repeat(27)}`;
  const tokenB = `sc_${'D'.repeat(27)}`;
  const requests = new Map([[tokenA, deferred()], [tokenB, deferred()]]);
  const wxCalls = installWx();
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    resolveCardShare(reference) {
      const bearer = reference.token ?? reference.scene;
      return requests.get(bearer).promise;
    },
  };

  try {
    const definition = await loadCardSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page, { token: tokenA });
    const stalePending = page.resolveShare.call(page);
    await Promise.resolve();

    page.onLoad.call(page, { token: tokenB });
    const currentPending = page.resolveShare.call(page);
    requests.get(tokenB).resolve(success('current'));
    await currentPending;
    requests.get(tokenA).resolve(success('stale'));
    await stalePending;

    assert.equal(page.data.card.displayName, '合成名片 current');
    assert.equal(page.onShareAppMessage.call(page).path, `/pages/card-share/index?token=${tokenB}`);
    assert.equal(
      wxCalls.filter(([name]) => name === 'showShareMenu').length,
      1,
      'the stale request must not enable forwarding',
    );
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('explicit demo share opens only in offline demo, keeps theme, and never resolves a cloud bearer', async () => {
  const wxCalls = installWx();
  let resolveCalls = 0;
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false },
    resolveCardShare: async () => {
      resolveCalls += 1;
      return success('unexpected');
    },
  };

  try {
    const definition = await loadCardSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page, { demo: '1', theme: 'champagne' });
    page.onShow.call(page);

    assert.equal(page.data.demoMode, true);
    assert.equal(page.data.state, 'SUCCESS');
    assert.equal(page.data.cardTheme, 'champagne');
    assert.match(page.data.stateDescription, /合成示例/);
    const displayedCard = page.data.card;
    const forward = page.onShareAppMessage.call(page);
    assert.equal(forward.title, 'AB Club 数字名片');
    assert.doesNotMatch(forward.title, new RegExp(page.data.card.displayName));
    assert.equal(forward.imageUrl, '/assets/brand/ab-club-brand-share.jpg');
    const forwardedPath = forward.path;
    assert.match(forwardedPath, /^\/pages\/card-share\/index\?demo=1&snapshot=[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
    assert.doesNotMatch(forwardedPath, /林知遥|demo@|\+41/);
    assert.equal(resolveCalls, 0);
    assert.equal(wxCalls.filter(([name]) => name === 'showShareMenu').length, 1);
    page.openMyCardEntry.call(page);
    assert.equal(wxCalls.findLast(([name]) => name === 'navigateTo')?.[1].url, '/packageCard/pages/edit/index?register=1');
    assert.equal(page.data.card, displayedCard, '进入自己的名片入口不应替换当前分享者');
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('demo query is rejected outside offline demo', async () => {
  const wxCalls = installWx();
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'LIVE', cloudConfigured: true },
    resolveCardShare: async () => success('unexpected'),
  };

  try {
    const definition = await loadCardSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page, { demo: '1' });

    assert.equal(page.data.demoMode, false);
    assert.equal(page.data.state, 'ERROR');
    assert.equal(page.data.allowForward, false);
    assert.match(page.data.stateDescription, /演示名片暂时无法打开/);
    assert.equal(wxCalls.filter(([name]) => name === 'showShareMenu').length, 0);
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('a demo snapshot cold start restores only its explicit public labels and fails closed after tampering', async () => {
  const wxCalls = installWx();
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false },
    resolveCardShare: async () => success('unexpected'),
  };

  try {
    const [definition, draftService, snapshotService] = await Promise.all([
      loadCardSharePage(),
      loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-draft.ts'),
      loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts'),
    ]);
    const draft = {
      ...draftService.createDefaultOfflineDemoDraft(),
      selectedLabels: ['艺术策展', '长期主义'],
      showTags: true,
      showPhone: false,
      showEmail: true,
    };
    const built = snapshotService.buildOfflineDemoSharePath(draft, 'stone');
    assert.equal(built.ok, true);
    const encoded = built.path.match(/[?&]snapshot=([^&]+)/)?.[1];
    assert.ok(encoded);

    const received = instantiate(definition);
    received.onLoad.call(received, { demo: '1', snapshot: encoded });
    assert.equal(received.data.state, 'SUCCESS');
    assert.equal(received.data.cardTheme, 'stone');
    assert.deepEqual(received.data.demoPublicLabels, ['艺术策展', '长期主义']);
    assert.equal(received.data.demoFields.some((field) => field.key === 'phone'), false);
    assert.equal(received.data.demoFields.some((field) => field.key === 'email'), true);

    const tampered = instantiate(definition);
    tampered.onLoad.call(tampered, {
      demo: '1',
      snapshot: `${encoded.slice(0, -1)}${encoded.endsWith('a') ? 'b' : 'a'}`,
    });
    assert.equal(tampered.data.state, 'ERROR');
    assert.equal(tampered.data.card, null);
    assert.deepEqual(tampered.data.demoPublicLabels, []);
    assert.equal(tampered.data.allowForward, false);
    assert.match(tampered.data.stateDescription, /无法读取/);
    assert.ok(wxCalls.filter(([name]) => name === 'showShareMenu').length >= 1);
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('a local identity cold start restores only public user input and never carries private contacts or demo fixtures', async () => {
  const wxCalls = installWx();
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'OFFLINE_DEMO', cloudConfigured: false },
    resolveCardShare: async () => success('unexpected'),
  };

  try {
    const [definition, snapshotService] = await Promise.all([
      loadCardSharePage(),
      loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts'),
    ]);
    const identity = {
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
    const built = snapshotService.buildLocalIdentitySharePath(identity, 'stone');
    assert.equal(built.ok, true);
    const encoded = built.path.match(/[?&]snapshot=([^&]+)/)?.[1];
    assert.ok(encoded);

    const received = instantiate(definition);
    received.onLoad.call(received, { local: '1', snapshot: encoded });
    assert.equal(received.data.state, 'SUCCESS');
    assert.equal(received.data.localIdentityMode, true);
    assert.equal(received.data.demoMode, false);
    assert.equal(received.data.card.displayName, identity.displayName);
    assert.equal(received.data.card.biography, '');
    assert.doesNotMatch(`${received.data.card.cardId} ${received.data.card.ownerUserId}`, /synthetic|demo/i);
    assert.deepEqual(received.data.demoPublicLabels, ['策展', '珠宝']);
    assert.deepEqual(received.data.demoFields, [{ key: 'profession', label: '职业', value: '独立策展人' }]);
    assert.doesNotMatch(JSON.stringify(received.data), /138 0013 8000|private@example\.com|AB Atelier|合成示例/);
    assert.equal(received.onShareAppMessage.call(received).path, built.path);
    assert.equal(received.onShareAppMessage.call(received).title, 'AB Club 数字名片');
    assert.doesNotMatch(received.onShareAppMessage.call(received).title, /本机填写者/);
    assert.equal(received.onShareAppMessage.call(received).imageUrl, '/assets/brand/ab-club-brand-share.jpg');
    assert.equal(received.data.stateTitle, '本机填写者 的数字名片');

    const tampered = instantiate(definition);
    tampered.onLoad.call(tampered, { local: '1', snapshot: `${encoded.slice(0, -1)}x` });
    assert.equal(tampered.data.state, 'ERROR');
    assert.equal(tampered.data.card, null);
    assert.equal(tampered.data.allowForward, false);
    assert.ok(wxCalls.filter(([name]) => name === 'showShareMenu').length >= 1);
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('visitor conversion checks the receiver own cloud card without replacing the shared person', async () => {
  const calls = installWx();
  let ownCardResult = {
    ok: true,
    data: { card: { cardId: 'card_receiver_own' } },
  };
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = {
    runtimeEvidence: { runtimeMode: 'LIVE', cloudConfigured: true },
    resolveCardShare: async () => success('shared-owner'),
    getMyCard: async () => ownCardResult,
  };

  try {
    const definition = await loadCardSharePage();
    const receiverWithCard = instantiate(definition);
    receiverWithCard.onLoad.call(receiverWithCard, { token: `sc_${'R'.repeat(27)}` });
    receiverWithCard.data.card = success('shared-owner').data.resolution.card;
    await receiverWithCard.refreshSelfCardState.call(receiverWithCard);
    assert.equal(receiverWithCard.data.selfCardState, 'HAS_CARD');
    receiverWithCard.openMyCardEntry.call(receiverWithCard);
    assert.equal(calls.findLast(([name]) => name === 'navigateTo')?.[1].url, '/pages/card/index');
    assert.equal(receiverWithCard.data.card.displayName, '合成名片 shared-owner');

    ownCardResult = { ok: false, code: 'NOT_FOUND', message: 'not found' };
    const receiverWithoutCard = instantiate(definition);
    receiverWithoutCard.onLoad.call(receiverWithoutCard, { token: `sc_${'N'.repeat(27)}` });
    receiverWithoutCard.data.card = success('another-shared-owner').data.resolution.card;
    await receiverWithoutCard.refreshSelfCardState.call(receiverWithoutCard);
    assert.equal(receiverWithoutCard.data.selfCardState, 'NO_CARD');
    receiverWithoutCard.openMyCardEntry.call(receiverWithoutCard);
    assert.equal(calls.findLast(([name]) => name === 'navigateTo')?.[1].url, '/packageCard/pages/edit/index');
    assert.equal(receiverWithoutCard.data.card.displayName, '合成名片 another-shared-owner');
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('A to B to C forwarding keeps A public card despite different recipient identities', async () => {
  installWx();
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = { resolveCardShare: async () => success('unexpected') };
  try {
    const snapshots = await loadBundledTypeScript('miniprogram/pages/card/services/offline-demo-share-snapshot.ts');
    const sender = { displayName: '分享者甲', profession: '建筑艺术', cityId: 'fr-paris', biography: '公开简介', selectedLabels: ['建筑', '设计'], showTags: true };
    const path = snapshots.buildLocalIdentitySharePath(sender, 'champagne').path;
    const options = Object.fromEntries(new URL(`https://local.test${path}`).searchParams);
    const definition = await loadCardSharePage();
    for (const name of ['接收者乙', '接收者丙']) {
      globalThis.wx.getStorageSync = (key) => key === 'ab.club.local-identity.v1' ? { ...sender, displayName: name } : null;
      const recipient = instantiate(definition);
      recipient.onLoad.call(recipient, options);
      recipient.onShow.call(recipient);
      assert.equal(recipient.data.card.displayName, '分享者甲');
      assert.equal(recipient.data.visitorTitle, '分享者甲 的数字名片');
      assert.equal(recipient.onShareAppMessage.call(recipient).path, path);
      assert.doesNotMatch(JSON.stringify(recipient.data.card), /接收者乙|接收者丙/);
    }
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('expired and revoked card shares remove stale sender data and display the exact failure state', async () => {
  const calls = installWx();
  let next = success('A');
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = { resolveCardShare: async () => next };
  try {
    const definition = await loadCardSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page, { token: `sc_${'X'.repeat(27)}` });
    await page.resolveShare.call(page);
    assert.equal(page.data.card.displayName, '合成名片 A');
    for (const [code, state, title] of [['TOKEN_EXPIRED', 'EXPIRED', '分享已过期'], ['TOKEN_REVOKED', 'REVOKED', '分享已撤销']]) {
      next = { ok: false, code, message: code, retryable: false };
      await page.resolveShare.call(page);
      assert.equal(page.data.state, state);
      assert.equal(page.data.stateTitle, title);
      assert.doesNotMatch(page.data.stateDescription, /重新核验|重新检查权限/);
      assert.equal(page.data.card, null);
      assert.equal(page.data.allowForward, false);
      assert.equal(page.onShareAppMessage.call(page).path, '/pages/card-share/index?invalid=1');
    }
    assert.equal(calls.filter(([name]) => name === 'showShareMenu').length, 1);
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});

test('conflicting local and bearer entries fail closed without consulting local identity as a card', async () => {
  installWx();
  let calls = 0;
  globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__ = { resolveCardShare: async () => { calls += 1; return success('unexpected'); } };
  try {
    const definition = await loadCardSharePage();
    const page = instantiate(definition);
    page.onLoad.call(page, { local: '1', token: `sc_${'Q'.repeat(27)}`, snapshot: 'bad' });
    page.onShow.call(page);
    assert.equal(page.data.state, 'ERROR');
    assert.match(page.data.stateDescription, /参数冲突/);
    assert.equal(page.data.card, null);
    assert.equal(calls, 0);
  } finally {
    delete globalThis.__AB_CARD_SHARE_PAGE_TEST_HOOKS__;
    delete globalThis.Page;
    delete globalThis.wx;
  }
});
