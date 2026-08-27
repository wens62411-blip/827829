import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const evidenceDirectory = resolve(here, 'evidence');
const screenshotDirectory = resolve(evidenceDirectory, 'screenshots');
const requiredScreenshots = [
  'bootstrap.png',
  'me.png',
  'card-self.png',
  'card-stranger.png',
  'card-friend.png',
  'privacy.png',
  'share-success.png',
  'share-expired.png',
  'share-revoked.png',
  'contact-sheet.png',
];

test('local visual evidence is watermarked and covers every requested state', async () => {
  const html = await readFile(resolve(evidenceDirectory, 'local-visual-reference.html'), 'utf8');
  assert.match(html, /LOCAL UI REFERENCE · SYNTHETIC DATA · NOT WECHAT DEVTOOLS/);
  for (const view of requiredScreenshots.filter((name) => name !== 'contact-sheet.png')) {
    assert.match(html, new RegExp(view.replace(/\.png$/, '')));
  }

  for (const filename of requiredScreenshots) {
    const image = await readFile(resolve(screenshotDirectory, filename));
    assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', filename);
    assert.ok(image.byteLength > 20_000, `${filename} is unexpectedly small`);
  }
});
