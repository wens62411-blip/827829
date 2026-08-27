import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const miniRoot = new URL('../../miniprogram/', import.meta.url);
const app = JSON.parse(readFileSync(new URL('app.json', miniRoot), 'utf8'));

const expectedMain = [
  'pages/bootstrap/index',
  'pages/discover/index',
  'pages/events/index',
  'pages/card/index',
  'pages/network/index',
  'pages/me/index',
  'pages/card-share/index',
  'pages/event-share/index',
];

test('main package and five tabs are frozen', () => {
  assert.deepEqual(app.pages, expectedMain);
  assert.equal(app.tabBar.list.length, 5);
  assert.deepEqual(app.tabBar.list.map((item) => item.text), ['首页', '活动', '名片', '人脉', '我的']);
  assert.ok(!app.tabBar.list.some((item) => item.text.includes('艺术')));
});

test('subpackage routes match the frozen route table', () => {
  const routeCounts = Object.fromEntries(app.subpackages.map((entry) => [entry.root, entry.pages.length]));
  assert.deepEqual(routeCounts, {
    packageCard: 4,
    packageSocial: 4,
    packageEvents: 4,
    packageArt: 3,
    packageAdmin: 5,
  });
  assert.equal(app.pages.length + app.subpackages.reduce((sum, item) => sum + item.pages.length, 0), 28);
});

test('every registered route has TypeScript, JSON, WXML and WXSS files', () => {
  const routes = [
    ...app.pages,
    ...app.subpackages.flatMap((entry) => entry.pages.map((page) => `${entry.root}/${page}`)),
  ];
  for (const route of routes) {
    for (const extension of ['.ts', '.json', '.wxml', '.wxss']) {
      assert.ok(existsSync(new URL(`${route}${extension}`, miniRoot)), `${route}${extension}`);
    }
  }
});

test('art is entered from Discover and share cold starts are main-package routes', () => {
  const discover = readFileSync(new URL('pages/discover/index.wxml', miniRoot), 'utf8');
  assert.match(discover, /\/packageArt\/pages\/channel\/index/);
  assert.ok(app.pages.includes('pages/card-share/index'));
  assert.ok(app.pages.includes('pages/event-share/index'));
  const eventShare = readFileSync(new URL('pages/event-share/index.ts', miniRoot), 'utf8');
  const actionTypes = readFileSync(new URL('shared/contracts/action-types.ts', miniRoot), 'utf8');
  assert.match(eventShare, /createShareEntryPage\('活动分享入口', 'EVENT'\)/);
  assert.match(actionTypes, /targetType: 'EVENT'; readonly targetId: EventId/);
  assert.match(actionTypes, /targetType: 'EVENT'; readonly page: 'pages\/event-share\/index'/);
});

test('project is explicitly LOCAL_ONLY and has no second frontend framework', () => {
  const local = JSON.parse(readFileSync(new URL('LOCAL_ONLY.json', root), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.equal(local.mode, 'LOCAL_ONLY');
  assert.equal(local.uploadAllowed, false);
  assert.equal(pkg.dependencies['tdesign-miniprogram'], '1.16.0');
  for (const forbidden of ['@tarojs/taro', 'uni-app', 'vant-weapp', 'weui-miniprogram']) {
    assert.equal(pkg.dependencies[forbidden], undefined);
  }
});
