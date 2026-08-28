import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path));
const text = (path) => read(path).toString('utf8');

function pngSize(buffer) {
  assert.deepEqual([...buffer.subarray(1, 4)], [0x50, 0x4e, 0x47]);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test('phase-one navigation is Discover, Events and Me with card owned by Me', () => {
  const app = JSON.parse(text('miniprogram/app.json'));
  assert.equal(app.entryPagePath, 'pages/discover/index');
  assert.deepEqual(
    app.tabBar.list.map((item) => [item.pagePath, item.text]),
    [
      ['pages/discover/index', '发现'],
      ['pages/events/index', '活动'],
      ['pages/me/index', '我的'],
    ],
  );
  assert.ok(!app.pages.includes('pages/bootstrap/index'));

  const discover = text('miniprogram/pages/discover/index.wxml');
  const me = text('miniprogram/pages/me/index.wxml');
  assert.doesNotMatch(discover, /(?:url|data-route)="\/pages\/card\/index"/);
  assert.match(me, /url="\/pages\/card\/index"/);
});

test('tab artwork is a restrained 81px thin-line set with one typography system', () => {
  const renderSource = text('scripts/render-ui-icons.mjs');
  assert.match(renderSource, /stroke-width="1\.3"/);
  assert.match(renderSource, /const tabIcons = \{[\s\S]*discover:[\s\S]*events:[\s\S]*me:/);

  const hashes = new Set();
  for (const name of ['home', 'events', 'me']) {
    for (const state of ['', '-active']) {
      const data = read(`miniprogram/assets/icons/tab-${name}${state}.png`);
      assert.deepEqual(pngSize(data), { width: 81, height: 81 });
      assert.ok(data.length < 8 * 1024, `${name}${state} tab icon should remain lightweight`);
      hashes.add(createHash('sha256').update(data).digest('hex'));
    }
  }
  assert.equal(hashes.size, 6, 'idle and active artwork should all be distinct');

  const tokens = text('miniprogram/shared/design-tokens/tokens.wxss');
  const appStyles = text('miniprogram/app.wxss');
  assert.match(tokens, /--ab-font-display:[^;]*Songti SC[^;]*STSong[^;]*serif/);
  assert.match(appStyles, /\.card-title,[\s\S]*font-family:\s*var\(--ab-font-display\)/);
  assert.match(appStyles, /button,[\s\S]*font-family:\s*inherit/);
});
