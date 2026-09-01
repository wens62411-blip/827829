import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');

async function loadDiscoverDefinition(consumeEntryFilmLaunch) {
  let definition;
  globalThis.Page = (candidate) => { definition = candidate; };
  globalThis.getApp = () => ({ consumeEntryFilmLaunch });
  globalThis.wx = {
    getWindowInfo: () => ({ statusBarHeight: 24 }),
    getSystemInfoSync: () => ({ statusBarHeight: 24 }),
    getMenuButtonBoundingClientRect: () => ({ top: 28, bottom: 60 }),
  };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/pages/discover/index.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#discover-${Date.now()}-${Math.random()}`);
  assert.ok(definition, 'Discover Page should register');
  return definition;
}

function createPage(definition) {
  return {
    data: structuredClone(definition.data),
    setData(patch, callback) {
      Object.assign(this.data, patch);
      callback?.();
    },
  };
}

async function loadAppDefinition(storageWrites) {
  let definition;
  globalThis.App = (candidate) => { definition = candidate; };
  globalThis.wx = {
    setStorageSync(key, value) { storageWrites.push({ key, value }); },
  };
  const result = await build({
    entryPoints: [resolve(root, 'miniprogram/app.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2020',
    write: false,
    logLevel: 'silent',
  });
  await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}#${Date.now()}-${Math.random()}`);
  assert.ok(definition, 'App should register');
  return definition;
}

function createApp(definition) {
  return {
    ...definition,
    globalData: structuredClone(definition.globalData),
  };
}

test('only a real discover cold start can consume the entry film once', async () => {
  const storageWrites = [];
  try {
    const definition = await loadAppDefinition(storageWrites);
    for (const path of ['', 'pages/discover/index', '/pages/discover/index?from=share']) {
      const app = createApp(definition);
      app.onLaunch.call(app, { path });
      assert.equal(app.consumeEntryFilmLaunch.call(app), true, path || 'default path');
      assert.equal(app.consumeEntryFilmLaunch.call(app), false, 'the same launch cannot replay');
    }

    for (const path of [
      'pages/card-share/index',
      '/pages/event-share/index?token=event',
      'packageCard/pages/view/index',
      'pages/me/index',
    ]) {
      const app = createApp(definition);
      app.onLaunch.call(app, { path });
      assert.equal(app.consumeEntryFilmLaunch.call(app), false, `${path} must bypass the intro`);
      assert.equal(app.consumeEntryFilmLaunch.call(app), false, 'later visits to discover must stay bypassed');
    }

    assert.ok(storageWrites.length > 0);
    assert.ok(storageWrites.every(({ key }) => key === 'ab_club_runtime_evidence'), 'intro state must remain memory-only');
  } finally {
    delete globalThis.App;
    delete globalThis.wx;
  }
});

test('one page-module claim covers the cold first frame but cannot replay after Discover is rebuilt', async () => {
  let consumeCalls = 0;
  try {
    const definition = await loadDiscoverDefinition(() => {
      consumeCalls += 1;
      return consumeCalls === 1;
    });

    assert.equal(consumeCalls, 1, 'the App launch gate is consumed once when the page module loads');
    assert.equal(definition.data.showEntryFilm, true, 'the first render starts covered');

    const firstPage = createPage(definition);
    definition.onLoad.call(firstPage);
    assert.equal(firstPage.data.showEntryFilm, true, 'the first Discover instance owns the cold-start film');

    const rebuiltPage = createPage(definition);
    definition.onLoad.call(rebuiltPage);
    assert.equal(rebuiltPage.data.showEntryFilm, false, 'a same-process page rebuild must not replay the film');
    assert.equal(consumeCalls, 1, 'page rebuilds use the module claim instead of consuming App state again');
  } finally {
    delete globalThis.Page;
    delete globalThis.getApp;
    delete globalThis.wx;
  }
});
