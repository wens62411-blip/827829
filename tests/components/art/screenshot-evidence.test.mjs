import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../..', import.meta.url));
const screenshotRoot = resolve(root, 'tests', 'components', 'art', 'screenshots');
const evidencePath = resolve(screenshotRoot, 'evidence.json');
const evidence = JSON.parse(readFileSync(evidencePath, 'utf8'));
const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

test('four screenshot artifacts are explicitly limited LOCAL_STATIC_RENDER evidence', () => {
  assert.equal(evidence.evidenceClass, 'LOCAL_STATIC_RENDER');
  assert.deepEqual(evidence.limitations, [
    'NOT_WECHAT_DEVTOOLS_PREVIEW',
    'NOT_IOS_OR_ANDROID_DEVICE_EVIDENCE',
    'NOT_RELEASE_EVIDENCE',
    'STATIC_HTML_USES_SYNTHETIC_DEMO_FIXTURES',
  ]);
  assert.deepEqual(evidence.viewportCssPixels, { width: 390, height: 844, deviceScaleFactor: 2 });
  assert.match(evidence.renderer, /(?:Google Chrome|Microsoft Edge) headless \(local executable\)/);
  assert.doesNotMatch(evidence.renderer, /[A-Za-z]:\\|AppData|Users\\/i);
  assert.deepEqual(Object.keys(evidence.screenshots).sort(), ['category', 'channel', 'detail', 'exception']);
});

test('every screenshot hash, PNG signature and 2x viewport dimension matches evidence', () => {
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const [view, record] of Object.entries(evidence.screenshots)) {
    const file = resolve(root, record.path);
    assert.ok(file.startsWith(`${screenshotRoot}${sep}`), `${view} path must stay in screenshot evidence`);
    const png = readFileSync(file);
    assert.equal(png.subarray(0, 8).equals(pngSignature), true, `${view} signature`);
    assert.equal(png.readUInt32BE(16), 780, `${view} width`);
    assert.equal(png.readUInt32BE(20), 1688, `${view} height`);
    assert.equal(sha256(file), record.sha256, `${view} sha256`);
  }
});

test('screenshot source hashes match the checked-in static renderer and non-real fallback', () => {
  const html = resolve(root, evidence.source.html);
  const fallback = resolve(root, evidence.source.fallback);
  assert.equal(sha256(html), evidence.source.htmlSha256);
  assert.equal(sha256(fallback), evidence.source.fallbackSha256);

  const source = readFileSync(html, 'utf8');
  for (const view of ['channel', 'category', 'detail', 'exception']) {
    assert.match(source, new RegExp(`data-screen="${view}"`));
  }
  assert.match(source, /LOCAL_STATIC_RENDER · NOT DEVTOOLS \/ DEVICE EVIDENCE/);
  assert.match(source, /LOCAL_STATIC_RENDER · NOT A REAL ARTWORK RECORD/);
  assert.match(source, /LOCAL_STATIC_RENDER · ERROR \/ EMPTY STATE/);
  assert.doesNotMatch(source, /<script[^>]+src=|<link[^>]+href=|<img[^>]+src="https?:/i);
});
