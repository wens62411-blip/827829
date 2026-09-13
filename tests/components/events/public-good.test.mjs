import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { transformSync } from 'esbuild';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const dataPath = 'miniprogram/packageEvents/data/public-good.ts';
const servicePath = 'miniprogram/packageEvents/services/public-good.ts';
const pagePath = 'miniprogram/packageEvents/pages/public-good/index.ts';
const plain = (value) => JSON.parse(JSON.stringify(value));

function runtime(globals = {}) {
  const cache = new Map();
  function load(relativePath) {
    const filename = path.resolve(projectRoot, relativePath);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = transformSync(readFileSync(filename, 'utf8'), {
      loader: 'ts', format: 'cjs', target: 'es2020', sourcefile: filename,
    }).code;
    vm.runInNewContext(code, {
      module,
      exports: module.exports,
      require: (id) => load(path.relative(projectRoot, path.resolve(path.dirname(filename), `${id}.ts`))),
      ...globals,
    }, { filename });
    return module.exports;
  }
  return load;
}

function memoryStorage(initial = '') {
  let value = initial;
  let readsFail = false;
  let writesFail = false;
  let writes = 0;
  return {
    getStorageSync() { if (readsFail) throw new Error('read denied'); return plain(value); },
    setStorageSync(key, next) { if (writesFail) throw new Error('disk full'); value = plain(next); writes += 1; },
    get value() { return plain(value); },
    get writes() { return writes; },
    failReads(value) { readsFail = value; },
    failWrites(value) { writesFail = value; },
  };
}

test('public good contains the supplied ten categories and 100 distinct stable actions', () => {
  const { PUBLIC_GOOD_CATEGORIES: categories, PUBLIC_GOOD_ACTIONS: actions } = runtime()(dataPath);
  assert.equal(categories.length, 10);
  assert.equal(actions.length, 100);
  assert.equal(new Set(actions.map((item) => item.id)).size, 100);
  assert.equal(new Set(actions.map((item) => item.text)).size, 100);
  for (const category of categories) {
    assert.equal(category.actions.length, 10);
    assert.ok(category.actions.every((item) => item.categoryId === category.id));
  }
  assert.deepEqual(plain(categories.map((item) => item.displayName)), [
    '致敬城市劳动者', '街头善意', '守护动物', '捐赠义举', '关爱儿童',
    '环境守护', '身边之人', '社区共建', '每日一善', '善待自己',
  ]);
  assert.equal(actions[0].text, '请环卫工人喝一瓶水');
  assert.equal(actions[99].text, '今天温柔对待自己，不自我评判');
});

test('drawing or selecting never awards credit; completing is idempotent and survives reopening', () => {
  const { createPublicGoodStore, PUBLIC_GOOD_STORAGE_KEY } = runtime()(servicePath);
  assert.equal(PUBLIC_GOOD_STORAGE_KEY, 'abclub.public-good.v1');
  const storage = memoryStorage();
  const store = createPublicGoodStore(storage);
  assert.equal(store.complete().added, false);
  const drawn = store.draw(() => 0);
  assert.equal(drawn.completedCount, 0);
  assert.equal(store.complete().snapshot.completedCount, 1);
  assert.equal(store.complete().added, false);
  assert.equal(store.complete().snapshot.completedCount, 1);
  const second = store.draw(() => 0);
  assert.notEqual(second.current.id, drawn.current.id);
  assert.equal(second.completedCount, 1);
  store.select(drawn.current.id);
  assert.equal(store.complete().added, false);
  const restored = createPublicGoodStore(storage).snapshot();
  assert.equal(restored.current.id, drawn.current.id);
  assert.equal(restored.currentCompleted, true);
  assert.equal(restored.completedCount, 1);
  assert.equal(storage.value.version, 1);
  assert.equal('card' in storage.value, false);
});

test('random draws span all 100 actions, avoid consecutive repeats, and prefer unfinished work', () => {
  const load = runtime();
  const { PUBLIC_GOOD_ACTIONS: actions } = load(dataPath);
  const { pickPublicGoodAction } = load(servicePath);
  const draws = actions.map((_, index) => pickPublicGoodAction([], null, () => (index + .5) / 100).id);
  assert.equal(new Set(draws).size, 100);
  const completed = actions.slice(0, 98).map((action) => action.id);
  assert.equal(pickPublicGoodAction(completed, actions[98].id, () => .7).id, actions[99].id);
  for (const roll of [-1, 0, .99, 1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const result = pickPublicGoodAction([], actions[0].id, () => roll);
    assert.ok(actions.some((action) => action.id === result.id));
    assert.notEqual(result.id, actions[0].id);
  }
  const finalUndone = actions.slice(0, 99).map((action) => action.id);
  assert.notEqual(pickPublicGoodAction(finalUndone, actions[99].id, () => .5).id, actions[99].id);
});

test('the complete pool remains drawable after 100 unique completions without inflating credit', () => {
  const load = runtime();
  const { PUBLIC_GOOD_ACTIONS: actions } = load(dataPath);
  const { createPublicGoodStore } = load(servicePath);
  const store = createPublicGoodStore(memoryStorage());
  for (const action of actions) {
    store.select(action.id);
    assert.equal(store.complete().added, true);
    assert.equal(store.complete().added, false);
  }
  assert.equal(store.snapshot().completedCount, 100);
  const last = store.snapshot().current.id;
  assert.notEqual(store.draw(() => .95).current.id, last);
  assert.equal(store.complete().added, false);
  assert.equal(store.snapshot().completedCount, 100);
});

test('corrupt storage retains valid unique completions and rejects unknown actions or forged counts', () => {
  const load = runtime();
  const { PUBLIC_GOOD_ACTIONS: actions } = load(dataPath);
  const { createPublicGoodStore, normalizePublicGoodProgress } = load(servicePath);
  const firstId = actions[0].id;
  const storage = memoryStorage({ version: 1, currentId: 'injected', completedIds: [firstId, firstId, 'injected', 10, null], completedCount: 99999 });
  const store = createPublicGoodStore(storage);
  const snapshot = store.snapshot();
  assert.equal(snapshot.current, null);
  assert.equal(snapshot.completedCount, 1);
  assert.equal(snapshot.repaired, true);
  assert.deepEqual(storage.value.completedIds, [firstId]);
  assert.equal(store.select('__proto__').current, null);
  assert.equal(store.complete().added, false);
  for (const corrupt of ['broken-json', 23, [], { version: 88 }, { version: 1, completedIds: 'bad' }]) {
    const result = normalizePublicGoodProgress(corrupt);
    assert.equal(result.progress.completedIds.length, 0);
    assert.equal(result.repaired, true);
  }
});

test('write failures stay explicit while memory state remains usable and can be saved on retry', () => {
  const { createPublicGoodStore } = runtime()(servicePath);
  const storage = memoryStorage();
  storage.failWrites(true);
  const store = createPublicGoodStore(storage);
  const drawn = store.draw(() => 0);
  assert.equal(drawn.saveFailed, true);
  assert.equal(store.complete().snapshot.completedCount, 1);
  assert.equal(store.snapshot().saveFailed, true);
  assert.equal(store.snapshot().current.id, drawn.current.id);
  assert.equal(store.complete().added, false);
  storage.failWrites(false);
  assert.equal(store.retrySave().saveFailed, false);
  assert.equal(createPublicGoodStore(storage).snapshot().completedCount, 1);
});

test('a failed initial read never overwrites unread history; recovery merges in-session progress', () => {
  const load = runtime();
  const { PUBLIC_GOOD_ACTIONS: actions } = load(dataPath);
  const { createPublicGoodStore } = load(servicePath);
  const storage = memoryStorage({ version: 1, currentId: actions[1].id, completedIds: [actions[1].id] });
  storage.failReads(true);
  const store = createPublicGoodStore(storage);
  assert.equal(store.snapshot().saveFailed, true);
  store.select(actions[0].id);
  store.complete();
  assert.equal(storage.writes, 0);
  assert.equal(store.snapshot().completedCount, 1);
  storage.failReads(false);
  const recovered = store.retrySave();
  assert.equal(recovered.saveFailed, false);
  assert.equal(recovered.completedCount, 2);
  assert.equal(recovered.current.id, actions[0].id);
  assert.equal(createPublicGoodStore(storage).snapshot().completedCount, 2);
});

test('snapshot consumers cannot mutate stored current action or completion history', () => {
  const { createPublicGoodStore } = runtime()(servicePath);
  const store = createPublicGoodStore(memoryStorage());
  store.draw(() => 0);
  store.complete();
  const snapshot = store.snapshot();
  snapshot.completedIds.length = 0;
  snapshot.current.text = 'replaced';
  assert.equal(store.snapshot().completedCount, 1);
  assert.notEqual(store.snapshot().current.text, 'replaced');
});

test('completion rechecks unread history once reading recovers before deciding to award credit', () => {
  const load = runtime();
  const { PUBLIC_GOOD_ACTIONS: actions } = load(dataPath);
  const { createPublicGoodStore } = load(servicePath);
  const storage = memoryStorage({ version: 1, currentId: actions[0].id, completedIds: [actions[0].id] });
  storage.failReads(true);
  const store = createPublicGoodStore(storage);
  store.select(actions[0].id);
  storage.failReads(false);
  assert.equal(store.complete().added, false);
  assert.equal(store.snapshot().completedCount, 1);
});

function createPage() {
  let definition;
  let nextTimer = 0;
  const timers = new Map();
  const storage = memoryStorage();
  const load = runtime({
    wx: { ...storage, pageScrollTo() {}, showToast() {} },
    Page: (value) => { definition = value; },
    setTimeout(callback) { const id = ++nextTimer; timers.set(id, callback); return id; },
    clearTimeout(id) { timers.delete(id); },
  });
  load(pagePath);
  const instance = { ...definition, data: plain(definition.data), setData(patch) { Object.assign(this.data, plain(patch)); } };
  const flush = () => { const pending = [...timers.entries()]; for (const [id, callback] of pending) { timers.delete(id); callback(); } };
  return { page: instance, timers, flush, store: load(servicePath).publicGoodStore };
}

test('page drawing is single-flight, completion ignores double taps, and hiding cancels scheduled work', () => {
  const { page, timers, flush, store } = createPage();
  page.onShow();
  page.drawAction();
  page.drawAction();
  assert.equal(timers.size, 1);
  assert.equal(page.data.drawing, true);
  page.completeAction();
  assert.equal(store.snapshot().completedCount, 0);
  flush();
  assert.ok(page.data.current);
  assert.equal(page.data.completedCount, 0);
  page.completeAction();
  page.completeAction();
  assert.equal(page.data.completedCount, 1);
  assert.equal(timers.size, 1);
  const previousId = page.data.current.id;
  page.drawAction();
  page.onHide();
  assert.equal(timers.size, 0);
  assert.equal(page.data.drawing, false);
  flush();
  page.onShow();
  assert.equal(page.data.current.id, previousId);
  assert.equal(page.data.completedCount, 1);
  page.drawAction();
  page.onUnload();
  assert.equal(timers.size, 0);
});

test('all category actions are selectable and remain distinct from marking complete', () => {
  const { page } = createPage();
  page.onShow();
  for (const category of page.data.categories) {
    page.selectCategory({ currentTarget: { dataset: { id: category.id } } });
    assert.equal(page.data.categoryActions.length, 10);
    const last = page.data.categoryActions[9];
    page.selectAction({ currentTarget: { dataset: { id: last.id } } });
    assert.equal(page.data.current.id, last.id);
    assert.equal(page.data.completedCount, 0);
  }
  const previousId = page.data.current.id;
  page.selectAction({ currentTarget: { dataset: { id: 'missing' } } });
  assert.equal(page.data.current.id, previousId);
});

test('initial WXML branches show the draw invitation and hide result, score animation, and failure banners', () => {
  const { page, flush } = createPage();
  page.onShow();
  const template = readFileSync(path.join(projectRoot, 'miniprogram/packageEvents/pages/public-good/index.wxml'), 'utf8');
  const conditions = [...template.matchAll(/wx:(?:if|elif)="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(conditions.length >= 7);
  for (const condition of conditions) assert.match(condition, /^\{\{[\s\S]+\}\}$/, 'WXML branch must evaluate state, not a truthy literal string');
  const evaluate = (expression) => vm.runInNewContext(`Boolean(${expression})`, plain(page.data));
  assert.equal(evaluate('current'), false);
  assert.equal(evaluate('!current'), true);
  for (const expression of ['currentCompleted', 'celebrating', 'completedCount === totalCount', 'saveFailed', 'repaired']) {
    assert.equal(evaluate(expression), false);
  }
  page.drawAction();
  flush();
  assert.equal(evaluate('current'), true);
  assert.equal(evaluate('!current'), false);
  assert.equal(evaluate('celebrating'), false);
});
