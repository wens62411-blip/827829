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

function installWx() {
  const calls = [];
  globalThis.wx = {
    hideShareMenu(input) { calls.push(['hideShareMenu', input]); },
    showShareMenu(input) { calls.push(['showShareMenu', input]); },
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
    assert.equal(pageA.onShareAppMessage.call(pageA).path, `/pages/card-share/index?token=${tokenA}`);
    assert.equal(pageB.onShareAppMessage.call(pageB).path, `/pages/card-share/index?token=${tokenB}`);
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
    const forwardedPath = page.onShareAppMessage.call(page).path;
    assert.match(forwardedPath, /^\/pages\/card-share\/index\?demo=1&snapshot=[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
    assert.doesNotMatch(forwardedPath, /林知遥|demo@|\+41/);
    assert.equal(resolveCalls, 0);
    assert.equal(wxCalls.filter(([name]) => name === 'showShareMenu').length, 1);
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
    assert.match(page.data.stateDescription, /不接受示例名片入口/);
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
    assert.match(tampered.data.stateDescription, /不完整或被修改/);
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
