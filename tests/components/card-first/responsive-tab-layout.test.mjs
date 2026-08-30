import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

function narrowRules(styles) {
  const start = styles.indexOf('@media (max-width: 340px)');
  assert.ok(start >= 0, '340px responsive rules must exist');
  const nextMedia = styles.indexOf('@media ', start + 1);
  return styles.slice(start, nextMedia >= 0 ? nextMedia : undefined);
}

test('global and native-tab page styles prevent horizontal and safe-area clipping', () => {
  const appStyles = read('miniprogram/app.wxss');
  const app = JSON.parse(read('miniprogram/app.json'));
  const meStyles = read('miniprogram/pages/me/index.wxss');

  assert.match(appStyles, /page\s*\{[\s\S]*?width:\s*100%;[\s\S]*?overflow-x:\s*hidden;/);
  assert.match(appStyles, /button,[\s\S]*?navigator\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?max-width:\s*100%;/);
  assert.match(appStyles, /\.ab-safe-bottom\s*\{[\s\S]*?padding-bottom:\s*calc\([^;]*safe-area-inset-bottom[^;]*\);/);
  assert.match(meStyles, /\.me-page\s*\{[\s\S]*?padding-bottom:\s*calc\(112rpx \+ env\(safe-area-inset-bottom\)\);[\s\S]*?overflow-x:\s*hidden;/);
  assert.deepEqual(app.tabBar.list.map(({ text }) => text), ['发现', '活动', '我的']);
});

test('Discover reflows constrained content instead of relying on offsets', () => {
  const styles = read('miniprogram/pages/discover/index.wxss');
  const narrow = narrowRules(styles);

  assert.doesNotMatch(styles, /(?:left|right):\s*-\d/);
  assert.match(styles, /\.discover-brand\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?flex:\s*1 1 auto;/);
  assert.match(styles, /\.discover-global-chip\s*\{[\s\S]*?box-sizing:\s*border-box;[\s\S]*?margin:\s*0;/);
  assert.match(styles, /\.discover-section__head > view\s*\{[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.discover-event-feature__notice\s*\{[\s\S]*?max-width:\s*calc\(100% - 36rpx\);/);

  assert.match(narrow, /\.discover-topbar\s*\{[\s\S]*?flex-wrap:\s*wrap;/);
  assert.match(narrow, /\.discover-runtime\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(narrow, /\.discover-city-group\s*\{[\s\S]*?grid-template-columns:\s*92rpx minmax\(0, 1fr\);/);
});

test('Me keeps profile, settings and city actions usable at 320–340px', () => {
  const styles = read('miniprogram/pages/me/index.wxss');
  const narrow = narrowRules(styles);

  assert.doesNotMatch(styles, /(?:left|right):\s*-\d/);
  assert.match(styles, /\.me-profile\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.me-link-row\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-width:\s*0;/);
  assert.match(styles, /\.me-city-group__actions\s*\{[\s\S]*?width:\s*100%;/);
  assert.match(styles, /\.me-city-group__action\s*\{[\s\S]*?min-width:\s*0;[\s\S]*?overflow-wrap:\s*anywhere;/);

  assert.match(narrow, /\.me-profile\s*\{[\s\S]*?grid-template-columns:\s*76rpx minmax\(0, 1fr\);/);
  assert.match(narrow, /\.me-profile__edit\s*\{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?width:\s*100%;/);
  assert.match(narrow, /\.me-city-group__masthead,[\s\S]*?\.me-city-group__actions\s*\{[\s\S]*?flex-direction:\s*column;/);
  assert.match(narrow, /\.me-city-group__action\s*\{[\s\S]*?width:\s*100%;/);
});
