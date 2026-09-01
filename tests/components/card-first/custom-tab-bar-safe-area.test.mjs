import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const templatePath = resolve(repoRoot, 'miniprogram/custom-tab-bar/index.wxml');
const stylePath = resolve(repoRoot, 'miniprogram/custom-tab-bar/index.wxss');

test('custom tab items stay above the gesture safe-area spacer', () => {
  const template = readFileSync(templatePath, 'utf8');
  const itemsIndex = template.indexOf('class="custom-tab-bar__items"');
  const safeIndex = template.indexOf('class="custom-tab-bar__safe"');

  assert.notEqual(itemsIndex, -1);
  assert.notEqual(safeIndex, -1);
  assert.ok(itemsIndex < safeIndex, 'safe-area spacer must follow the tab items');
});

test('custom tab safe-area has a zero-height fallback before env()', () => {
  const styles = readFileSync(stylePath, 'utf8');
  assert.match(
    styles,
    /\.custom-tab-bar__safe\s*\{[\s\S]*?height:\s*0\s*;[\s\S]*?height:\s*env\(safe-area-inset-bottom\)\s*;/,
  );
});
