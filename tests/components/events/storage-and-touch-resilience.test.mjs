import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { build } from 'esbuild';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

async function loadSafeStorage(wxImplementation) {
  const entryPoint = fileURLToPath(new URL(
    '../../../miniprogram/shared/utils/safe-storage.ts',
    import.meta.url,
  ));
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  });
  const bundled = result.outputFiles[0]?.text;
  assert.ok(bundled);
  globalThis.wx = wxImplementation;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundled).toString('base64')}#${Math.random()}`;
  return import(moduleUrl);
}

test('safe storage keeps the last in-memory value when device storage throws', async () => {
  const storage = await loadSafeStorage({
    getStorageSync() { throw new Error('storage unavailable'); },
    setStorageSync() { throw new Error('storage unavailable'); },
  });

  assert.equal(storage.safeGetStorageSync('city', 'default-city'), 'default-city');
  assert.equal(storage.safeSetStorageSync('city', 'selected-city'), false);
  assert.equal(storage.safeGetStorageSync('city', 'default-city'), 'selected-city');
});

test('safe storage prefers a persisted value and mirrors it in memory', async () => {
  let reads = 0;
  const storage = await loadSafeStorage({
    getStorageSync() {
      reads += 1;
      if (reads === 1) return 'persisted-city';
      throw new Error('later storage failure');
    },
    setStorageSync() {},
  });

  assert.equal(storage.safeGetStorageSync('city', 'default-city'), 'persisted-city');
  assert.equal(storage.safeGetStorageSync('city', 'default-city'), 'persisted-city');
});

test('app and activity pages use fail-open storage wrappers', () => {
  const helper = read('miniprogram/shared/utils/safe-storage.ts');
  const app = read('miniprogram/app.ts');
  const events = read('miniprogram/pages/events/index.ts');
  const city = read('miniprogram/packageEvents/pages/city/index.ts');

  assert.match(helper, /try\s*\{[\s\S]*wx\.getStorageSync/);
  assert.match(helper, /try\s*\{[\s\S]*wx\.setStorageSync/);
  assert.match(app, /safeSetStorageSync\('ab_club_runtime_evidence'/);
  assert.match(events, /safeGetStorageSync\('ab-events-city-id',\s*DEFAULT_CITY\.id\)/);
  assert.match(events, /safeSetStorageSync\('ab-events-city-id',\s*city\.id\)/);
  assert.match(city, /safeGetStorageSync\('ab-events-city-id'/);
  assert.match(city, /safeSetStorageSync\('ab-events-city-id',\s*city\.id\)/);
  assert.doesNotMatch(`${app}\n${events}\n${city}`, /wx\.(?:get|set)StorageSync/);
});

test('all activity-page buttons meet the shared 88rpx touch target', () => {
  const styles = read('miniprogram/pages/events/index.wxss');

  for (const selector of [
    '.events-directory-chip',
    '.filter-heading__directory',
    '.city-filter',
    '.city-directory-note button',
  ]) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(styles, new RegExp(`${escaped}\\s*\\{[^}]*min-height:\\s*var\\(--ab-touch-target\\)`, 's'));
  }
});
