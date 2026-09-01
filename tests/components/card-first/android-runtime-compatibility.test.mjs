import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (relativePath) => readFileSync(resolve(repositoryRoot, relativePath), 'utf8');

test('eagerly loaded card code avoids Unicode property escape syntax unsupported by older Android runtimes', () => {
  for (const relativePath of [
    'miniprogram/pages/card/services/offline-demo-draft.ts',
    'miniprogram/components/ab-profile-card/index.ts',
  ]) {
    assert.doesNotMatch(
      read(relativePath),
      /\\[pP]\{/,
      `${relativePath} must not contain an ES2018 Unicode property escape literal`,
    );
  }
});

test('loading transition timers are isolated per custom-tab component instance', () => {
  const source = read('miniprogram/components/loading-city/index.ts');
  assert.match(source, /new WeakMap<object, ReturnType<typeof setTimeout>>\(\)/);
  assert.doesNotMatch(source, /let\s+activeTimer\s*:/);
  assert.match(source, /clearActiveTimer\(this\)/);
});
