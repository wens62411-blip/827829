import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const html = join(here, 'static-render.html');
const fallback = resolve(here, '../../../miniprogram/assets/art/not-real-artwork-fallback.svg');
const outputDirectory = join(here, 'screenshots');
const views = ['channel', 'category', 'detail', 'exception'];
const browserCandidates = [
  process.env.AB_ART_BROWSER,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const browser = browserCandidates.find((candidate) => existsSync(candidate));
if (!browser) throw new Error('Chrome or Edge was not found. Set AB_ART_BROWSER to an explicit executable path.');
if (!existsSync(html) || !existsSync(fallback)) throw new Error('Static render source or fallback asset is missing.');

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const profile = mkdtempSync(join(tmpdir(), 'ab-art-static-render-'));
mkdirSync(outputDirectory, { recursive: true });

try {
  for (const view of views) {
    const output = join(outputDirectory, `${view}.png`);
    const url = `${pathToFileURL(html).href}?view=${encodeURIComponent(view)}`;
    const result = spawnSync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--disable-background-networking',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      '--allow-file-access-from-files',
      '--force-device-scale-factor=2',
      '--window-size=390,844',
      '--virtual-time-budget=1000',
      `--user-data-dir=${profile}`,
      `--screenshot=${output}`,
      url,
    ], { encoding: 'utf8', windowsHide: true });

    if (result.status !== 0) {
      throw new Error(`Static render failed for ${view}: ${result.stderr || result.stdout || `exit ${result.status}`}`);
    }
    if (!existsSync(output) || statSync(output).size < 10_000) {
      throw new Error(`Static render did not create a substantive PNG for ${view}.`);
    }
  }

  const renderer = browser.toLowerCase().includes('msedge')
    ? 'Microsoft Edge headless (local executable)'
    : 'Google Chrome headless (local executable)';
  const evidence = {
    evidenceClass: 'LOCAL_STATIC_RENDER',
    limitations: [
      'NOT_WECHAT_DEVTOOLS_PREVIEW',
      'NOT_IOS_OR_ANDROID_DEVICE_EVIDENCE',
      'NOT_RELEASE_EVIDENCE',
      'STATIC_HTML_USES_SYNTHETIC_DEMO_FIXTURES',
    ],
    viewportCssPixels: { width: 390, height: 844, deviceScaleFactor: 2 },
    renderer,
    source: {
      html: 'tests/components/art/static-render.html',
      htmlSha256: digest(html),
      fallback: 'miniprogram/assets/art/not-real-artwork-fallback.svg',
      fallbackSha256: digest(fallback),
    },
    screenshots: Object.fromEntries(views.map((view) => [view, {
      path: `tests/components/art/screenshots/${view}.png`,
      sha256: digest(join(outputDirectory, `${view}.png`)),
    }])),
  };
  writeFileSync(join(outputDirectory, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  process.stdout.write(`Generated ${views.length} LOCAL_STATIC_RENDER screenshots with explicit non-DevTools evidence labels.\n`);
} finally {
  rmSync(profile, { recursive: true, force: true });
}
