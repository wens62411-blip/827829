import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

test('card subpages use a safe existing stack and keep a cold-start fallback', () => {
  const cases = [
    {
      template: 'miniprogram/packageCard/pages/edit/index.wxml',
      source: 'miniprogram/packageCard/pages/edit/index.ts',
      handler: 'returnToOwnerCard',
      fallback: '/pages/card/index',
    },
    {
      template: 'miniprogram/packageCard/pages/share/index.wxml',
      source: 'miniprogram/packageCard/pages/share/index.ts',
      handler: 'returnToOwnerCard',
      fallback: '/pages/card/index',
    },
    {
      template: 'miniprogram/packageCard/pages/privacy/index.wxml',
      source: 'miniprogram/packageCard/pages/privacy/index.ts',
      handler: 'returnToEditor',
      fallback: '/packageCard/pages/edit/index',
    },
  ];

  for (const entry of cases) {
    const template = read(entry.template);
    const source = read(entry.source);

    assert.match(template, new RegExp(`bindtap="${entry.handler}"`), entry.template);
    assert.doesNotMatch(template, /<navigator\b[^>]*>返回(?:我的名片|编辑名片)<\/navigator>/);
    assert.match(source, new RegExp(`${entry.handler}\\(\\)\\s*\\{[\\s\\S]*getCurrentPages\\(\\)`));
    assert.match(source, /wx\.navigateBack\(\)/);
    assert.match(source, new RegExp(`wx\\.redirectTo\\(\\{ url: '${entry.fallback.replaceAll('/', '\\/')}' \\}\\)`));
  }

  const editorSource = read('miniprogram/packageCard/pages/edit/index.ts');
  assert.match(editorSource, /openedForRegistration:\s*false/);
  assert.match(editorSource, /this\.openedForRegistration\s*=\s*registerMode\s*&&\s*!localReady/);
  assert.match(editorSource, /previousRoute\s*===\s*'pages\/card\/index'/);
  assert.match(editorSource, /previousRoute\s*===\s*'pages\/me\/index'/);
  assert.match(editorSource, /!this\.openedForRegistration[\s\S]*wx\.navigateBack\(\)[\s\S]*wx\.redirectTo\(\{ url: '\/pages\/card\/index' \}\)/);
});
