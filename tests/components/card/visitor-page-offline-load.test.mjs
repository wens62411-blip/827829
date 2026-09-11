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

test('visitor surfaces stay read-only and keep the shared person while opening the local card CTA', () => {
  const source = read('miniprogram/packageCard/pages/view/index.ts');
  const template = read('miniprogram/packageCard/pages/view/index.wxml');
  const shareSource = read('miniprogram/pages/card-share/index.ts');
  const shareTemplate = read('miniprogram/pages/card-share/index.wxml');
  const combinedTemplates = `${template}\n${shareTemplate}`;

  assert.doesNotMatch(
    combinedTemplates,
    /申请认识|交换名片|添加好友|建立好友关系|好友关系|本机名片|克制|清除/,
  );
  assert.doesNotMatch(template, /packageSocial\/pages\/friend/);
  assert.match(combinedTemplates, /创建我的数字名片/);
  assert.match(combinedTemplates, /查看我的名片/);

  for (const candidate of [source, shareSource]) {
    const start = candidate.indexOf('openMyCardEntry()');
    const end = candidate.indexOf('\n  },', start);
    const body = candidate.slice(start, end);
    assert.match(body, /wx\.navigateTo\(/, '打开自己的名片应保留访客页返回栈');
    assert.doesNotMatch(body, /switchTab|redirectTo|reLaunch/);
    assert.doesNotMatch(body, /this\.data\.card\s*=|card:\s*this\.data\.card|viewedOwnerUserId\s*=/);
  }

  assert.doesNotMatch(source, /visitorForwardPath|ownerUserId=\$\{encodeURIComponent/);
  assert.doesNotMatch(template, /open-type="share"/);
  assert.match(source, /Legacy owner-id routes remain readable/);
  assert.match(shareSource, /title:\s*safeShareTitle\(card\.displayName\)/);
  assert.match(shareSource, /path:\s*`\/pages\/card-share\/index\?\$\{query\}\$\{themeQuery\}`/);
  assert.match(shareSource, /SAFE_VISITOR_SHARE_COVER\s*=\s*['"]\/assets\/brand\/ab-club-share-safe-cover\.jpg['"]/);
  assert.equal((shareSource.match(/imageUrl:\s*SAFE_VISITOR_SHARE_COVER/g) ?? []).length, 3);
  assert.doesNotMatch(`${source}\n${shareSource}`, /(?:phone|email)[^\n]*encodeURIComponent|encodeURIComponent\([^)]*(?:phone|email)/i);
});

test('visitor failures clear the prior card instead of falling back to another person', () => {
  const source = read('miniprogram/packageCard/pages/view/index.ts');
  const shareSource = read('miniprogram/pages/card-share/index.ts');

  assert.match(source, /if \(!result\.ok\) \{[\s\S]*?card:\s*null[\s\S]*?visitorTitle:\s*DEFAULT_VISITOR_TITLE/);
  assert.match(source, /result\.data\.card\.ownerUserId !== viewedOwnerUserId[\s\S]*?card:\s*null/);
  assert.match(shareSource, /if \(!result\.ok\) \{[\s\S]*?card:\s*null[\s\S]*?visitorTitle:\s*DEFAULT_VISITOR_TITLE/);
  assert.match(shareSource, /catch \(_error\) \{[\s\S]*?card:\s*null[\s\S]*?visitorTitle:\s*DEFAULT_VISITOR_TITLE/);
});
