import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../../..');
const read = p => readFileSync(resolve(root, p), 'utf8');
const app = JSON.parse(read('miniprogram/app.json'));

test('native navigation has complete light and dark palettes without changing customer tabs', () => {
  assert.equal(app.darkmode, true);
  assert.equal(app.themeLocation, 'theme.json');
  const palettes = JSON.parse(read('miniprogram/theme.json'));
  for (const mode of ['light', 'dark']) {
    const palette = palettes[mode];
    for (const scope of [app.window, app.tabBar]) {
      for (const value of Object.values(scope)) {
        if (typeof value === 'string' && value.startsWith('@')) {
          assert.ok(palette[value.slice(1)], `missing ${mode} ${value}`);
        }
      }
    }
  }
  assert.equal(palettes.light.navigationBarTextStyle, 'black');
  assert.equal(palettes.dark.navigationBarTextStyle, 'white');
  assert.deepEqual(app.tabBar.list.map(t => t.text), ['发现', '活动', '我的']);
});

test('custom tabs and Discover match system dark mode while editor retains its explicit ivory work surface', () => {
  const tabs = read('miniprogram/custom-tab-bar/index.wxss');
  assert.match(tabs, /@media \(prefers-color-scheme: dark\)/);
  assert.match(tabs, /\.custom-tab-bar\s*\{ background: #24211d;/);
  assert.match(tabs, /\.custom-tab-bar__text\s*\{ color: #bdb4a7;/);
  const editor = JSON.parse(read('miniprogram/packageCard/pages/edit/index.json'));
  assert.equal(editor.navigationBarBackgroundColor, '#F4EFE6');
  assert.equal(editor.navigationBarTextStyle, 'black');
  const discover = read('miniprogram/pages/discover/index.wxss');
  assert.match(discover, /--discover-paper:\s*#24211d/);
  assert.match(discover, /--discover-ink:\s*#fffaf0/);
  assert.match(read('miniprogram/pages/events/index.wxss'), /\.category-filter--selected \.category-filter__en\s*\{ color: #6d501f;/);
});
