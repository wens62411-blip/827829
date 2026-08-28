import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('visitor OFFLINE_DEMO registers without eagerly loading the live identity client', () => {
  const source = read('miniprogram/packageCard/pages/view/index.ts');

  assert.doesNotMatch(
    source,
    /import\s*\{[\s\S]*?getCardForViewer[\s\S]*?from\s+['"]\.\.\/\.\.\/\.\.\/pages\/card\/services\/identity-client['"];/,
  );
  assert.match(source, /type IdentityClientModule = typeof import\(['"]\.\.\/\.\.\/\.\.\/pages\/card\/services\/identity-client['"]\);/);
  assert.match(source, /declare const require: \(path: string\) => IdentityClientModule;/);
  assert.match(source, /function getCardRuntime\(\)/);
  assert.doesNotMatch(source, /getRuntimeEvidence/);
  assert.doesNotMatch(
    source,
    /^let\s+viewedOwnerUserId\b/m,
    'the viewed owner must not leak through module-level state shared by multiple page instances',
  );
  assert.match(source, /Page\(\{[\s\S]*?viewedOwnerUserId:\s*undefined as UserId \| undefined,/);
  assert.match(source, /viewLoadGeneration:\s*0,/);
  assert.match(source, /viewUnloaded:\s*true,/);
  assert.match(
    source,
    /const isCurrentLoad = \(\) => \([\s\S]*?this\.viewLoadGeneration === loadGeneration[\s\S]*?this\.viewedOwnerUserId === viewedOwnerUserId/,
    'late async results must be rejected when the page instance or viewed owner has changed',
  );

  const loadCardBody = source.slice(source.indexOf('async loadCard('));
  const demoGuard = loadCardBody.indexOf('if (this.data.demoMode && !viewedOwnerUserId)');
  const liveClientLoad = loadCardBody.indexOf('loadIdentityClient()');
  assert.ok(demoGuard >= 0, 'visitor page must retain the explicit offline demo guard');
  assert.ok(liveClientLoad > demoGuard, 'live identity client must load only after the offline demo guard');
});
