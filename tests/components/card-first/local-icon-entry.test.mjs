import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

const pageExpectations = {
  'miniprogram/pages/card/index.wxml': ['ui-edit.png', 'ui-share-light.png'],
  'miniprogram/pages/me/index.wxml': [
    'ui-edit.png', 'ui-card.png',
    'ui-settings.png', 'ui-privacy.png', 'ui-share.png', 'ui-tag.png', 'ui-chevron.png',
  ],
  'miniprogram/pages/network/index.wxml': ['ui-card-light.png', 'ui-inbox.png', 'ui-chevron.png'],
};

test('card, Me, and secondary network page expose their local icon entry points', () => {
  for (const [page, expectedNames] of Object.entries(pageExpectations)) {
    const template = read(page);
    const localIconPaths = [...template.matchAll(/src="(\/assets\/icons\/[^"]+\.png)"/g)].map((match) => match[1]);

    for (const name of expectedNames) {
      const iconPath = `/assets/icons/${name}`;
      assert.ok(localIconPaths.includes(iconPath), `${page} 缺少 ${iconPath}`);
    }

    for (const iconPath of new Set(localIconPaths)) {
      assert.ok(
        existsSync(resolve(repoRoot, 'miniprogram', iconPath.slice(1))),
        `${page} 引用了不存在的本地图标 ${iconPath}`,
      );
    }
  }
});
