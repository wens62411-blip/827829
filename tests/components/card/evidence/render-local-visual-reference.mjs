import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const playwrightEntry = process.env.PLAYWRIGHT_MODULE;
if (!playwrightEntry) {
  throw new Error('PLAYWRIGHT_MODULE must point to an installed Playwright package entry.');
}
const require = createRequire(import.meta.url);
const { chromium } = require(playwrightEntry);
const outputDirectory = resolve(here, 'screenshots');
const sourceUrl = pathToFileURL(resolve(here, 'local-visual-reference.html')).href;
const views = [
  'bootstrap',
  'me',
  'card-self',
  'card-stranger',
  'card-friend',
  'privacy',
  'share-success',
  'share-expired',
  'share-revoked',
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const mobile = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 1 });
  for (const view of views) {
    await mobile.goto(`${sourceUrl}?view=${view}`);
    await mobile.waitForFunction(() => document.documentElement.dataset.ready === 'true');
    await mobile.screenshot({
      path: resolve(outputDirectory, `${view}.png`),
      fullPage: true,
    });
  }
  await mobile.close();

  const contact = await browser.newPage({ viewport: { width: 1370, height: 1100 }, deviceScaleFactor: 1 });
  await contact.goto(`${sourceUrl}?view=contact`);
  await contact.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await contact.screenshot({
    path: resolve(outputDirectory, 'contact-sheet.png'),
    fullPage: true,
  });
  await contact.close();
} finally {
  await browser.close();
}

console.log(`LOCAL_VISUAL_REFERENCE_PASS ${views.length} views + contact sheet`);
