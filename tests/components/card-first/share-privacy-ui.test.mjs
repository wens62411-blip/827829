import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('poster page offers image saving and conditional stop-sharing without developer tools', () => {
  const template = read('miniprogram/packageCard/pages/share/index.wxml');
  const config = JSON.parse(read('miniprogram/packageCard/pages/share/index.json'));

  assert.match(template, /<ab-profile-card\b[\s\S]*?card="\{\{card\}\}"/);
  assert.match(template, /viewer-mode="STRANGER"/);
  assert.match(template, /fields="\{\{demoMode \? demoFields : \[\]\}\}"/);
  assert.match(template, /bindtap="generatePoster"/);
  assert.match(template, /bindtap="savePosterToAlbum"/);
  assert.match(template, /!demoMode && card && hasRevocableShare/);
  assert.match(template, /bindtap="revokeShare"[^>]*>[\s\S]*?停止分享/);
  assert.match(template, /theme="\{\{cardTheme\}\}"/);
  assert.equal(config.navigationBarTitleText, '名片海报');
  assert.doesNotMatch(template, /微信分享卡片预览|发送示例名片|createQrScene|clearLocalRevocationPointer|创建 7 天分享入口/);
  assert.equal(config.usingComponents?.['ab-profile-card'], '/components/ab-profile-card/index');
  assert.doesNotMatch(template, /OPENID|profile ID|PUBLIC PROJECTION|小程序码 scene|Canvas 2D|高熵 token/);
});

test('privacy page explains choices in member language, not implementation language', () => {
  const template = read('miniprogram/packageCard/pages/privacy/index.wxml');

  assert.match(template, /所有人可见|仅人脉可见|仅自己可见/);
  assert.match(template, /暂未开放调整|不会伪装成已经保存/);
  assert.doesNotMatch(template, /冻结 DTO|PUBLIC|FRIENDS_ONLY|PRIVATE|OPENID|运行模式/);
});

test('visitor page identifies the sender and offers a separate create-own-card entry', () => {
  const template = read('miniprogram/packageCard/pages/view/index.wxml');
  const source = read('miniprogram/packageCard/pages/view/index.ts');
  const ownerTemplate = read('miniprogram/pages/card/index.wxml');

  assert.match(template, /查看分享者选择公开的资料/);
  assert.match(template, /创建我的数字名片/);
  assert.match(template, /bindtap="openMyCardEntry"/);
  assert.doesNotMatch(template, /交换名片|需要对方确认|添加好友|建立好友/);
  assert.doesNotMatch(ownerTemplate, /view\/index\?preview=STRANGER/);
  assert.match(source, /demoVisitorPreview[\s\S]*viewerMode:\s*this\.data\.demoVisitorPreview \? 'STRANGER' : 'SELF'/);
  assert.doesNotMatch(source, /import\s*\{[\s\S]*?getRuntimeEvidence[\s\S]*?\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/pages\/card\/services\/identity-client['"]/);
  assert.match(source, /function loadIdentityClient\(\)[\s\S]*require\(['"]\.\.\/\.\.\/\.\.\/pages\/card\/services\/identity-client['"]\)/);
  assert.match(source, /if \(this\.data\.demoMode && !viewedOwnerUserId\)[\s\S]*return;[\s\S]*loadIdentityClient\(\)/);
  assert.doesNotMatch(template, /服务端投影|服务端核验|运行模式|当前视角/);
});

test('core card journey keeps implementation language out of member-facing templates', () => {
  const templates = [
    'miniprogram/pages/card/index.wxml',
    'miniprogram/pages/me/index.wxml',
    'miniprogram/packageCard/pages/privacy/index.wxml',
    'miniprogram/packageCard/pages/share/index.wxml',
    'miniprogram/packageCard/pages/view/index.wxml',
  ].map(read).join('\n');

  assert.doesNotMatch(templates, /OPENID|高熵 token|Canvas 2D|冻结 DTO|PUBLIC PROJECTION|运行模式：|服务端投影|小程序码 scene/);
});
