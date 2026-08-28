import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const moduleRoot = process.env.CODEX_BUNDLED_NODE_MODULES;
if (!moduleRoot) {
  throw new Error('Set CODEX_BUNDLED_NODE_MODULES to the bundled Node modules directory.');
}

const require = createRequire(import.meta.url);
const sharp = require(resolve(moduleRoot, 'sharp'));
const outputDir = resolve('miniprogram/assets/icons');

const icons = {
  contact: [
    '<path d="M16 2v2"/>',
    '<path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>',
    '<path d="M8 2v2"/>',
    '<circle cx="12" cy="11" r="3"/>',
    '<rect x="3" y="4" width="18" height="18" rx="2"/>',
  ],
  users: [
    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>',
    '<path d="M16 3.128a4 4 0 0 1 0 7.744"/>',
    '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    '<circle cx="9" cy="7" r="4"/>',
  ],
  compass: [
    '<circle cx="12" cy="12" r="10"/>',
    '<path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z"/>',
  ],
  user: [
    '<circle cx="12" cy="8" r="5"/>',
    '<path d="M20 21a8 8 0 0 0-16 0"/>',
  ],
  calendar: [
    '<path d="M8 2v4"/>',
    '<path d="M16 2v4"/>',
    '<rect x="3" y="4" width="18" height="18" rx="2"/>',
    '<path d="M3 10h18"/>',
    '<path d="M8 14h.01"/>',
    '<path d="M12 14h.01"/>',
    '<path d="M16 14h.01"/>',
    '<path d="M8 18h.01"/>',
    '<path d="M12 18h.01"/>',
  ],
  location: [
    '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/>',
    '<circle cx="12" cy="10" r="3"/>',
  ],
  exchange: [
    '<path d="m2 9 3-3 3 3"/>',
    '<path d="M13 18H7a2 2 0 0 1-2-2V6"/>',
    '<path d="m22 15-3 3-3-3"/>',
    '<path d="M11 6h6a2 2 0 0 1 2 2v10"/>',
  ],
  share: [
    '<circle cx="18" cy="5" r="3"/>',
    '<circle cx="6" cy="12" r="3"/>',
    '<circle cx="18" cy="19" r="3"/>',
    '<line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/>',
    '<line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  ],
  edit: [
    '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    '<path d="m15 5 4 4"/>',
  ],
  inbox: [
    '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>',
    '<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  ],
  settings: [
    '<path d="M10 5H3"/>', '<path d="M12 19H3"/>', '<path d="M14 3v4"/>',
    '<path d="M16 17v4"/>', '<path d="M21 12h-9"/>', '<path d="M21 19h-5"/>',
    '<path d="M21 5h-7"/>', '<path d="M8 10v4"/>', '<path d="M8 12H3"/>',
  ],
  privacy: [
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    '<path d="m9 12 2 2 4-4"/>',
  ],
  tag: [
    '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/>',
    '<circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none"/>',
  ],
  chevron: ['<path d="m9 18 6-6-6-6"/>'],
};

const tabIcons = {
  discover: [
    '<circle cx="12" cy="12" r="8.25"/>',
    '<path d="M12 6.2 13.7 10.3 17.8 12l-4.1 1.7-1.7 4.1-1.7-4.1L6.2 12l4.1-1.7z"/>',
    '<circle cx="12" cy="12" r=".75" fill="currentColor" stroke="none"/>',
  ],
  events: [
    '<path d="M7.5 4v3.2M16.5 4v3.2"/>',
    '<path d="M5 6.2h14v13.3H5z"/>',
    '<path d="M5 10h14"/>',
    '<circle cx="9" cy="14.5" r=".85" fill="currentColor" stroke="none"/>',
    '<path d="M12 14.5h4"/>',
  ],
  me: [
    '<circle cx="12" cy="8.3" r="3.55"/>',
    '<path d="M5.4 20c.55-4.05 2.8-6.1 6.6-6.1s6.05 2.05 6.6 6.1"/>',
  ],
};

function svg(name, color, size) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${icons[name].join('')}
    </svg>
  `);
}

function tabSvg(name, color, size) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"
      fill="none" stroke="${color}" color="${color}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
      ${tabIcons[name].join('')}
    </svg>
  `);
}

async function render(fileName, name, color, size) {
  await sharp(svg(name, color, size), { density: 216 }).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(resolve(outputDir, fileName));
}

async function renderTab(fileName, name, color, size) {
  await sharp(tabSvg(name, color, size), { density: 216 }).resize(size, size).png({ compressionLevel: 9, palette: true }).toFile(resolve(outputDir, fileName));
}

await mkdir(outputDir, { recursive: true });

const muted = '#756F66';
const selected = '#98723A';
const uiGold = '#8A6538';
const uiLight = '#FFF7E8';

for (const [fileName, name] of [
  ['tab-home.png', 'discover'],
  ['tab-events.png', 'events'],
  ['tab-me.png', 'me'],
]) {
  await renderTab(fileName, name, muted, 81);
  await renderTab(fileName.replace('.png', '-active.png'), name, selected, 81);
}

for (const [fileName, name] of [
  ['ui-location.png', 'location'],
  ['ui-exchange.png', 'exchange'],
  ['ui-share.png', 'share'],
  ['ui-edit.png', 'edit'],
  ['ui-card.png', 'contact'],
  ['ui-inbox.png', 'inbox'],
  ['ui-network.png', 'users'],
  ['ui-settings.png', 'settings'],
  ['ui-privacy.png', 'privacy'],
  ['ui-tag.png', 'tag'],
  ['ui-chevron.png', 'chevron'],
]) {
  await render(fileName, name, uiGold, 64);
}

for (const [fileName, name] of [
  ['ui-card-light.png', 'contact'],
  ['ui-exchange-light.png', 'exchange'],
  ['ui-share-light.png', 'share'],
  ['ui-edit-light.png', 'edit'],
]) {
  await render(fileName, name, uiLight, 64);
}
