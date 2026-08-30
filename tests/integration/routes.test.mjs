import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../../', import.meta.url);
const miniRoot = new URL('../../miniprogram/', import.meta.url);
const app = JSON.parse(readFileSync(new URL('app.json', miniRoot), 'utf8'));

const registeredRoutePaths = new Set([
  ...app.pages.map((page) => `/${page}`),
  ...app.subpackages.flatMap((entry) => entry.pages.map((page) => `/${entry.root}/${page}`)),
]);
const tabRoutePaths = new Set(app.tabBar.list.map((item) => `/${item.pagePath}`));

const visibleRouteSurfaces = [
  'pages/discover/index',
  'pages/events/index',
  'pages/me/index',
  'pages/card/index',
  'pages/card-share/index',
  'pages/network/index',
  'packageCard/pages/edit/index',
  'packageCard/pages/privacy/index',
  'packageCard/pages/view/index',
  'packageCard/pages/share/index',
  'packageEvents/pages/city/index',
  'packageEvents/pages/event/index',
  'packageSocial/pages/friend/index',
  'packageSocial/pages/requests/index',
  'packageSocial/pages/tag-apply/index',
  'packageSocial/pages/tag-status/index',
];

const expectedMain = [
  'pages/discover/index',
  'pages/events/index',
  'pages/card/index',
  'pages/me/index',
  'pages/network/index',
  'pages/card-share/index',
  'pages/event-share/index',
];

test('main package starts on Discover with Discover, Events, and Me tabs only', () => {
  assert.deepEqual(app.pages, expectedMain);
  assert.equal(app.entryPagePath, 'pages/discover/index');
  assert.equal(app.tabBar.list.length, 3);
  assert.deepEqual(app.tabBar.list.map((item) => item.text), ['发现', '活动', '我的']);
  assert.deepEqual(app.tabBar.list.map((item) => item.pagePath), [
    'pages/discover/index',
    'pages/events/index',
    'pages/me/index',
  ]);
  assert.ok(!app.pages.includes('pages/bootstrap/index'));
  for (const extension of ['.ts', '.json', '.wxml', '.wxss']) {
    assert.equal(existsSync(new URL(`pages/bootstrap/index${extension}`, miniRoot)), false);
  }
  assert.ok(!app.tabBar.list.some((item) => item.text === '人脉'));
  assert.ok(!app.tabBar.list.some((item) => item.text.includes('艺术')));
});

test('every tab ships distinct 81px PNG artwork for idle and selected states', () => {
  const iconPaths = [];

  for (const item of app.tabBar.list) {
    for (const field of ['iconPath', 'selectedIconPath']) {
      const iconPath = item[field];
      assert.match(iconPath, /^assets\/icons\/[a-z0-9-]+\.png$/, `${item.text}.${field}`);

      const iconUrl = new URL(iconPath, miniRoot);
      assert.ok(existsSync(iconUrl), `${item.text}.${field} 缺少本地文件 ${iconPath}`);
      assert.ok(statSync(iconUrl).size < 40 * 1024, `${iconPath} 应小于 40KB`);

      const png = readFileSync(iconUrl);
      assert.deepEqual(
        [...png.subarray(0, 8)],
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        `${iconPath} 必须是真实 PNG`,
      );
      assert.deepEqual(
        [png.readUInt32BE(16), png.readUInt32BE(20)],
        [81, 81],
        `${iconPath} 必须是 81x81`,
      );
      iconPaths.push(iconPath);
    }
  }

  assert.equal(iconPaths.length, 6);
  assert.equal(new Set(iconPaths).size, 6, '三个 tab 的默认/选中图标不应共用同一文件');
});

test('subpackage routes match the frozen route table', () => {
  const routeCounts = Object.fromEntries(app.subpackages.map((entry) => [entry.root, entry.pages.length]));
  assert.deepEqual(routeCounts, {
    packageCard: 4,
    packageSocial: 4,
    packageEvents: 3,
    packageArt: 3,
    packageAdmin: 5,
  });
  assert.equal(app.pages.length + app.subpackages.reduce((sum, item) => sum + item.pages.length, 0), 26);
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

test('share cold starts are main-package routes', () => {
  assert.ok(app.pages.includes('pages/card-share/index'));
  assert.ok(app.pages.includes('pages/event-share/index'));
  const eventShare = readFileSync(new URL('pages/event-share/index.ts', miniRoot), 'utf8');
  const actionTypes = readFileSync(new URL('shared/contracts/action-types.ts', miniRoot), 'utf8');
  assert.match(eventShare, /createShareEntryPage\('活动分享入口', 'EVENT'\)/);
  assert.match(actionTypes, /targetType: 'EVENT'; readonly targetId: EventId/);
  assert.match(actionTypes, /targetType: 'EVENT'; readonly page: 'pages\/event-share\/index'/);
});

test('all links and fallbacks targeting the Activity tab use switchTab', () => {
  const discover = readFileSync(new URL('pages/discover/index.wxml', miniRoot), 'utf8');
  const eventShare = readFileSync(new URL('pages/event-share/index.wxml', miniRoot), 'utf8');
  const citySource = readFileSync(new URL('packageEvents/pages/city/index.ts', miniRoot), 'utf8');
  const eventSource = readFileSync(new URL('packageEvents/pages/event/index.ts', miniRoot), 'utf8');

  assert.match(discover, /<navigator\b[^>]*open-type="switchTab"[^>]*url="\/pages\/events\/index"/);
  assert.match(eventShare, /open-type="switchTab"[^>]*url="\/pages\/events\/index"/);
  assert.match(citySource, /wx\.switchTab\(\{ url: '\/pages\/events\/index' \}\)/);
  assert.match(eventSource, /wx\.switchTab\(\{ url: '\/pages\/events\/index' \}\)/);
  assert.doesNotMatch(`${citySource}\n${eventSource}`, /redirectTo\(\{ url: '\/pages\/events\/index'/);
});

test('visible navigators resolve to registered routes and use switchTab only for real tabs', () => {
  for (const route of visibleRouteSurfaces) {
    const template = readFileSync(new URL(`${route}.wxml`, miniRoot), 'utf8');
    for (const match of template.matchAll(/<navigator\b([^>]*)>/g)) {
      const attributes = match[1];
      const rawUrl = attributes.match(/\burl="([^"]+)"/)?.[1];
      if (!rawUrl) continue;
      const path = rawUrl.split('?')[0];
      const usesSwitchTab = /\bopen-type="switchTab"/.test(attributes);
      assert.ok(registeredRoutePaths.has(path), `${route} 指向未注册页面 ${path}`);
      assert.equal(
        usesSwitchTab,
        tabRoutePaths.has(path),
        `${route} → ${path} 的页面类型与 ${usesSwitchTab ? 'switchTab' : 'navigateTo'} 不匹配`,
      );
    }
  }
});

test('every visible tap binding has a page or component method', () => {
  const surfaces = [
    ...visibleRouteSurfaces,
    'components/ab-event-card/index',
  ];
  for (const route of surfaces) {
    const template = readFileSync(new URL(`${route}.wxml`, miniRoot), 'utf8');
    const source = readFileSync(new URL(`${route}.ts`, miniRoot), 'utf8');
    for (const match of template.matchAll(/\b(?:bindtap|catchtap|bind:[A-Za-z][\w-]*)="([A-Za-z_$][\w$]*)"/g)) {
      const method = match[1];
      assert.match(source, new RegExp(`\\b${method}\\s*\\(`), `${route} 缺少 ${method} 点击方法`);
    }
  }
});

test('activity card forwards the clicked event identity into the registered detail route', () => {
  const componentSource = readFileSync(new URL('components/ab-event-card/index.ts', miniRoot), 'utf8');
  const eventsSource = readFileSync(new URL('pages/events/index.ts', miniRoot), 'utf8');
  assert.match(componentSource, /triggerEvent\('open',\s*\{\s*eventId:\s*this\.properties\.eventId\s*\}\)/);
  assert.match(eventsSource, /const eventId = event\.detail\.eventId/);
  assert.match(eventsSource, /eventId\.startsWith\('demo:'\)[\s\S]*?demoEventId=/);
  assert.match(eventsSource, /wx\.navigateTo\(\{ url: `\/packageEvents\/pages\/event\/index\?\$\{query\}` \}\)/);
});

test('project permits only an authorized experience upload and has no second frontend framework', () => {
  const local = JSON.parse(readFileSync(new URL('LOCAL_ONLY.json', root), 'utf8'));
  const pkg = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'));
  assert.equal(local.mode, 'EXPERIENCE_ONLY');
  assert.equal(local.appId, null, '可提交策略文件不能携带本机 AppID');
  assert.equal(local.cloudEnvironment, null);
  assert.equal(local.uploadAllowed, true);
  assert.equal(local.releaseAllowed, false);
  assert.equal(pkg.dependencies['tdesign-miniprogram'], '1.16.0');
  for (const forbidden of ['@tarojs/taro', 'uni-app', 'vant-weapp', 'weui-miniprogram']) {
    assert.equal(pkg.dependencies[forbidden], undefined);
  }
});
