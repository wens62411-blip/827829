import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { build } from 'esbuild';

const root = resolve(import.meta.dirname, '../../..');
const sourcePath = resolve(root, 'miniprogram/components/ab-entry-film/index.ts');
const componentRoot = resolve(root, 'miniprogram/components/ab-entry-film');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const bundle = await build({
  entryPoints: [sourcePath],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2020',
  write: false,
  logLevel: 'silent',
});
const bundledSource = bundle.outputFiles[0].text;

function fakeClock() {
  let now = 0;
  let nextId = 1;
  const tasks = new Map();
  const schedule = (callback, delay, interval) => {
    const id = nextId++;
    tasks.set(id, { callback, due: now + Math.max(0, Number(delay) || 0), interval });
    return id;
  };
  return {
    setTimeout: (callback, delay) => schedule(callback, delay, 0),
    clearTimeout: (id) => tasks.delete(id),
    setInterval: (callback, delay) => schedule(callback, delay, Math.max(1, Number(delay) || 1)),
    clearInterval: (id) => tasks.delete(id),
    advance(milliseconds) {
      const target = now + milliseconds;
      for (let guard = 0; guard < 100000; guard += 1) {
        const pending = [...tasks].filter(([, task]) => task.due <= target).sort((a, b) => a[1].due - b[1].due || a[0] - b[0]);
        if (!pending.length) break;
        const [id, task] = pending[0];
        now = task.due;
        if (task.interval) {
          task.due += task.interval;
          tasks.set(id, task);
        } else {
          tasks.delete(id);
        }
        task.callback();
      }
      now = target;
    },
    pendingCount: () => tasks.size,
  };
}

function loadComponent({ ready = true } = {}) {
  const clock = fakeClock();
  let definition;
  const context = {
    module: { exports: {} },
    exports: {},
    Component(value) { definition = value; },
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
    setInterval: clock.setInterval,
    clearInterval: clock.clearInterval,
  };
  vm.runInNewContext(bundledSource, context, { filename: 'ab-entry-film.bundle.cjs' });
  assert.ok(definition, 'component definition should register');

  const events = [];
  const instance = {
    data: structuredClone(definition.data),
    setData(patch, callback) {
      Object.assign(this.data, patch);
      callback?.();
    },
    triggerEvent(name, detail) { events.push({ name, detail }); },
  };
  definition.lifetimes.attached.call(instance);
  if (ready) definition.lifetimes.ready.call(instance);
  return { clock, definition, instance, events };
}

const tap = (fixture, timeStamp) => fixture.definition.methods.handleTap.call(fixture.instance, { timeStamp });
const skip = (fixture) => fixture.definition.methods.handleSkip.call(fixture.instance);

test('entry film is cold-start gated by the discover page, keeps one tap event, and removes the legacy component gate', () => {
  const discover = read('miniprogram/pages/discover/index.wxml');
  const discoverSource = read('miniprogram/pages/discover/index.ts');
  const config = JSON.parse(read('miniprogram/pages/discover/index.json'));
  const template = read('miniprogram/components/ab-entry-film/index.wxml');
  const componentSource = read('miniprogram/components/ab-entry-film/index.ts');
  const componentStyles = read('miniprogram/components/ab-entry-film/index.wxss');
  const tabSource = read('miniprogram/custom-tab-bar/index.ts');
  const tabTemplate = read('miniprogram/custom-tab-bar/index.wxml');
  const eventsSource = read('miniprogram/pages/events/index.ts');
  const meSource = read('miniprogram/pages/me/index.ts');
  const app = JSON.parse(read('miniprogram/app.json'));

  assert.match(discover, /^<ab-entry-film wx:if="\{\{showEntryFilm\}\}" bind:complete="handleEntryFilmComplete" \/>/);
  assert.match(discoverSource, /showEntryFilm:\s*initialColdStartEntryFilm/);
  assert.match(discoverSource, /consumeEntryFilmLaunch\?\.\(\) === true/);
  assert.match(discoverSource, /claimColdStartEntryFilmForPage\(\)/);
  assert.match(discoverSource, /handleEntryFilmComplete\(\)/);
  assert.equal(config.usingComponents['ab-entry-film'], '/components/ab-entry-film/index');
  assert.equal(config.navigationStyle, 'custom');
  assert.equal('navigationBarTitleText' in config, false);
  assert.match(discover, /class="discover-topbar" style="padding-top: \{\{navigationSafeHeight\}\}px"/);
  assert.match(discoverSource, /updateTabBarPresentation\(this, 0, this\.data\.showEntryFilm\)/);
  assert.doesNotMatch(discoverSource, /wx\.(?:hideTabBar|showTabBar)\(/);
  assert.match(tabSource, /hidden:\s*true/);
  assert.match(tabTemplate, /^<view wx:if="\{\{!hidden\}\}" class="custom-tab-bar"/);
  assert.match(eventsSource, /tabBar\.setData\(\{ selected: 1, hidden: false \}\)/);
  assert.match(meSource, /tabBar\.setData\(\{ selected: 2, hidden: false \}\)/);
  assert.match(componentStyles, /\.entry-film\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*0;[\s\S]*?right:\s*0;[\s\S]*?bottom:\s*0;[\s\S]*?left:\s*0;/);
  assert.equal(app.tabBar.custom, true);
  assert.deepEqual(app.tabBar.list.map((item) => item.text), ['发现', '活动', '我的']);
  assert.equal((template.match(/catchtap="handleTap"/g) ?? []).length, 1);
  assert.equal((template.match(/catchtap="handleSkip"/g) ?? []).length, 1);
  assert.doesNotMatch(template, /(?:bind|catch)touchend=/);
  assert.match(template, /catchtouchmove="blockTouchMove"/);
  assert.doesNotMatch(componentSource, /entryShownThisSession|shouldStart/);
  assert.doesNotMatch(tabSource, /introShown|冷启动入场动画/);
});

test('skip control matches the restrained bottom-right transparent outline reference and does not bubble into scene advance', () => {
  const template = read('miniprogram/components/ab-entry-film/index.wxml');
  const source = read('miniprogram/components/ab-entry-film/index.ts');
  const styles = read('miniprogram/components/ab-entry-film/index.wxss');

  assert.match(template, /<button[\s\S]*?class="entry-film__skip"[\s\S]*?catchtap="handleSkip"[\s\S]*?aria-label="跳过开场动画并进入发现首页"[\s\S]*?><text class="entry-film__skip-label">跳过<\/text><\/button>/);
  assert.doesNotMatch(template, /skipButtonTop|style="top:/);
  assert.doesNotMatch(template, /class="entry-film__skip"[\s\S]*?bindtap=/);
  assert.doesNotMatch(source, /skipButtonTop|readSkipButtonTop/);
  assert.match(source, /completionReason:\s*'auto' \| 'tap' \| 'skip'/);
  const skipRule = styles.match(/\.entry-film__skip\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(skipRule, /right:\s*34rpx/);
  assert.match(skipRule, /bottom:\s*calc\(42rpx \+ env\(safe-area-inset-bottom\)\)/);
  assert.match(skipRule, /min-width:\s*152rpx/);
  assert.match(skipRule, /min-height:\s*88rpx/);
  assert.match(skipRule, /border:\s*0/);
  assert.match(skipRule, /background:\s*transparent/);
  const labelRule = styles.match(/\.entry-film__skip-label\s*\{([^}]*)\}/)?.[1] ?? '';
  assert.match(labelRule, /width:\s*136rpx/);
  assert.match(labelRule, /height:\s*64rpx/);
  assert.match(labelRule, /border:\s*2rpx solid rgba\(255, 255, 255, 0\.82\)/);
  assert.match(labelRule, /border-radius:\s*999rpx/);
  const backgroundAlpha = Number(labelRule.match(/background:\s*rgba\(255, 255, 255, ([\d.]+)\)/)?.[1]);
  assert.ok(backgroundAlpha > 0 && backgroundAlpha < 0.1, 'visible pill should remain almost transparent');
  assert.doesNotMatch(labelRule, /backdrop-filter/);
});

test('component WXSS uses explicit visual classes instead of descendant tag selectors', () => {
  const template = read('miniprogram/components/ab-entry-film/index.wxml');
  const styles = read('miniprogram/components/ab-entry-film/index.wxss');

  for (const className of [
    'entry-film__city-meta-rule',
    'entry-film__editorial-title-line',
    'entry-film__objects-title-line',
    'entry-film__object-image',
    'entry-film__object-label-text',
    'entry-film__crest-image',
    'entry-film__fallback-crest',
  ]) assert.match(template, new RegExp(`class="[^"]*${className}`));
  assert.doesNotMatch(styles, /\.entry-film__[\w-]+(?:\s+\.[\w-]+)*\s+(?:view|text|image)(?=[\s,{:#.])/);
  assert.match(styles, /\.entry-film__editorial-title\s*\{[\s\S]*?right:\s*46rpx;[\s\S]*?left:\s*46rpx;/);
});

test('entry film is opaque before ready so slow devices never expose the Discover page', () => {
  const fixture = loadComponent({ ready: false });
  assert.equal(fixture.instance.data.visible, true);
  assert.equal(fixture.instance.data.sceneIndex, 0);
  assert.equal(fixture.clock.pendingCount(), 0, 'playback starts only after the component is ready');

  fixture.definition.lifetimes.ready.call(fixture.instance);
  assert.equal(fixture.instance.data.visible, true);
  assert.equal(fixture.clock.pendingCount(), 2);
});

test('decorative years, counters, and shot numbers are removed while approved content remains', () => {
  const source = read('miniprogram/components/ab-entry-film/index.ts');
  const template = read('miniprogram/components/ab-entry-film/index.wxml');
  const styles = read('miniprogram/components/ab-entry-film/index.wxss');

  assert.doesNotMatch(template, /MMXXVI|13-CITY PASSAGE|city\.counter|city\.nextEn|next\s*·/i);
  assert.doesNotMatch(template, /COLLECTORS\s*·\s*01|PAPER\s*&amp;\s*VALUE\s*·\s*02|<text>0[123]<\/text>/);
  assert.doesNotMatch(template, /COLLECTING\s*·\s*MEMORY|FINANCIAL HISTORY|A curated way of seeing|TELEPHONE\s*·\s*CAMERAS/);
  assert.doesNotMatch(source, /counter:|nextEn:/);
  assert.doesNotMatch(styles, /entry-film__(?:counter|next|kicker|photo-caption|editorial-foot|objects-foot)/);

  assert.match(template, /\{\{city\.en\}\}/);
  assert.match(template, /Collectors gather[\s\S]*timeless vintage[\s\S]*treasures from[\s\S]*across the world/);
  assert.match(template, /Financial stock[\s\S]*certificates/);
  assert.match(template, /Objects,[\s\S]*held in time\./);
  for (const label of ['Telephone', 'Cameras', 'Large-format']) assert.match(template, new RegExp(label));
  assert.match(template, /assets\/brand\/ab-club-crest\.png/);
  assert.doesNotMatch(template, /轻触可加速/);
  assert.doesNotMatch(template, /entry-film__tap-hint/);
});

test('city flash keeps the approved cadence while preloading the next unfiltered frame', () => {
  const source = read('miniprogram/components/ab-entry-film/index.ts');
  const template = read('miniprogram/components/ab-entry-film/index.wxml');
  const styles = read('miniprogram/components/ab-entry-film/index.wxss');

  assert.match(source, /const CITY_FRAME_MS = 92;/);
  assert.match(source, /nextCity: getNextCity\(cityIndex\)/);
  assert.equal((template.match(/src="\{\{nextCity\.imagePath\}\}"/g) ?? []).length, 1);
  assert.ok((template.match(/fade-in="\{\{false\}\}"/g) ?? []).length >= 9);
  assert.match(styles, /\.entry-film__city-preload \{ z-index: -1; opacity: 0; pointer-events: none; \}/);
  assert.doesNotMatch(styles, /\.entry-film__city-image[^\n]*(?:filter|scale|translate3d)/);
});

test('native editorial scenes use clear local JPEG layers with stable evidence hashes', () => {
  const expected = {
    'collector-photo.jpg': ['703b985f22075c23b74ff86d53c9e26ac46e719e480cca2c56b73b04daa4bd1b', 70 * 1024],
    'certificates-photo.jpg': ['745901cc893d1dfead5c0c8060df2eebfa7400a2f95ff480fe990568d96af569', 105 * 1024],
    'telephone-panel.jpg': ['90c38111a890f6623e6c28709dac67a4b5c4acee001ddc135ae67f0fbc356a47', 25 * 1024],
    'cameras-panel.jpg': ['47af2c5b9529314116073b517c839a11b82978649d95059039687d751bda6df7', 45 * 1024],
    'large-format-panel.jpg': ['30eb670b5f2fa8ff555f24e14f67c68f66426ad474ccb507b2d9474a1ed5a777', 18 * 1024],
    'manor-background.jpg': ['d9774794cc3f6c1eac54ff937e4aa9edfd129aa0896da3b0c39ff89779c64f55', 85 * 1024],
  };
  for (const [name, [expectedHash, maximumBytes]] of Object.entries(expected)) {
    const path = resolve(root, 'miniprogram/assets/entry-film', name);
    const bytes = readFileSync(path);
    assert.equal(bytes.readUInt16BE(0), 0xffd8, `${name} must be JPEG`);
    assert.ok(statSync(path).size < maximumBytes, `${name} should remain within its clarity budget`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedHash);
  }
  const template = read('miniprogram/components/ab-entry-film/index.wxml');
  const styles = read('miniprogram/components/ab-entry-film/index.wxss');
  assert.equal((template.match(/assets\/entry-film\//g) ?? []).length, 6);
  assert.ok((template.match(/fade-in="\{\{false\}\}"/g) ?? []).length >= 8);
  assert.ok((template.match(/binderror="handleImageError"/g) ?? []).length >= 7);
  assert.equal((template.match(/entry-film__object-panel entry-film__object-panel--/g) ?? []).length, 3);
  assert.match(template, /entry-film__photo-curtain/);
  assert.match(styles, /entryFilmCurtainReveal 650ms/);
  assert.match(styles, /entryFilmPanelRise 650ms/);
  assert.match(styles, /entry-film__object-panel--one \{ animation-delay: 80ms; \}/);
  assert.match(styles, /entry-film__object-panel--two \{ animation-delay: 270ms; \}/);
  assert.match(styles, /entry-film__object-panel--three \{ animation-delay: 460ms; \}/);
  assert.doesNotMatch(template, /\/(?:collector|certificates|objects|manor)\.jpg/);
});

test('automatic playback traverses every scene and truly removes the overlay', () => {
  const fixture = loadComponent();
  assert.equal(fixture.instance.data.visible, true);
  assert.equal(fixture.instance.data.sceneIndex, 0);
  fixture.clock.advance(20000);
  assert.equal(fixture.instance.data.visible, false);
  assert.equal(fixture.events.length, 1);
  assert.equal(fixture.events[0].name, 'complete');
  assert.equal(fixture.events[0].detail.reason, 'auto');
});

test('one tap advances one scene, duplicate timestamps are ignored, and stale auto timers cannot double-advance', () => {
  const fixture = loadComponent();
  fixture.clock.advance(500);
  tap(fixture, 1000);
  tap(fixture, 1000);
  fixture.clock.advance(154);
  assert.equal(fixture.instance.data.sceneIndex, 1);
  fixture.clock.advance(1050);
  assert.equal(fixture.instance.data.sceneIndex, 1, 'the cancelled city timer must not advance again');
});

test('skip immediately completes once, clears in-flight scene work, and stays safe across later lifecycle events', () => {
  const fixture = loadComponent();
  fixture.clock.advance(300);
  tap(fixture, 1000);
  assert.ok(fixture.clock.pendingCount() > 0, 'a scene transition should be in flight');

  skip(fixture);
  assert.equal(fixture.instance.data.visible, false);
  assert.equal(fixture.instance.data.exiting, false);
  assert.equal(fixture.clock.pendingCount(), 0);
  assert.equal(fixture.events.length, 1);
  assert.equal(fixture.events[0].name, 'complete');
  assert.equal(fixture.events[0].detail.reason, 'skip');

  skip(fixture);
  fixture.clock.advance(20000);
  fixture.definition.pageLifetimes.hide.call(fixture.instance);
  fixture.definition.pageLifetimes.show.call(fixture.instance);
  assert.equal(fixture.events.length, 1, 'double taps, stale timers, and page resume cannot complete twice');
});

test('rapid distinct taps are queued and consumed exactly one scene at a time', () => {
  const fixture = loadComponent();
  tap(fixture, 100);
  fixture.clock.advance(154);
  assert.equal(fixture.instance.data.sceneIndex, 1);

  tap(fixture, 200);
  tap(fixture, 201);
  tap(fixture, 202);
  fixture.clock.advance(154 * 3);
  assert.equal(fixture.instance.data.sceneIndex, 4);

  tap(fixture, 300);
  fixture.clock.advance(2099);
  assert.equal(fixture.instance.data.visible, true, 'the final manor frame must remain visible for its minimum hold');
  assert.equal(fixture.instance.data.exiting, false);
  fixture.clock.advance(1);
  assert.equal(fixture.instance.data.exiting, true, 'the final frame should auto-slide after the hold');
  fixture.clock.advance(459);
  assert.equal(fixture.instance.data.visible, true);
  fixture.clock.advance(1);
  assert.equal(fixture.instance.data.visible, false);
  assert.equal(fixture.events.length, 1);
  assert.equal(fixture.events[0].name, 'complete');
  assert.equal(fixture.events[0].detail.reason, 'auto');
});

test('hiding during the final upward exit still completes exactly once on resume', () => {
  const fixture = loadComponent();
  tap(fixture, 100);
  fixture.clock.advance(154);
  tap(fixture, 200);
  tap(fixture, 201);
  tap(fixture, 202);
  fixture.clock.advance(154 * 3 + 2100);
  assert.equal(fixture.instance.data.sceneIndex, 4);
  assert.equal(fixture.instance.data.exiting, true);

  fixture.definition.pageLifetimes.hide.call(fixture.instance);
  fixture.clock.advance(1000);
  assert.equal(fixture.events.length, 0);
  fixture.definition.pageLifetimes.show.call(fixture.instance);
  assert.equal(fixture.instance.data.visible, false);
  assert.equal(fixture.events.length, 1);
  fixture.definition.pageLifetimes.show.call(fixture.instance);
  assert.equal(fixture.events.length, 1);
});

test('hide pauses old timers, show resumes one timer, and image failures fail closed without a black screen', () => {
  const fixture = loadComponent();
  fixture.clock.advance(184);
  assert.equal(fixture.instance.data.cityIndex, 2);
  fixture.definition.pageLifetimes.hide.call(fixture.instance);
  const pausedCity = fixture.instance.data.cityIndex;
  fixture.clock.advance(10000);
  assert.equal(fixture.instance.data.cityIndex, pausedCity);
  assert.equal(fixture.clock.pendingCount(), 0);

  fixture.definition.pageLifetimes.show.call(fixture.instance);
  assert.equal(fixture.clock.pendingCount(), 2);
  fixture.definition.methods.handleImageError.call(fixture.instance);
  assert.equal(fixture.instance.data.cityIndex, pausedCity + 1);

  tap(fixture, 400);
  fixture.clock.advance(154);
  fixture.definition.methods.handleImageError.call(fixture.instance);
  assert.equal(fixture.instance.data.imageFailed, true);
  fixture.clock.advance(2400);
  assert.ok(fixture.instance.data.sceneIndex >= 2, 'fallback must keep progressing');
});
