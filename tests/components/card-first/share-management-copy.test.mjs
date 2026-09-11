import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

test('poster and access management is explicitly independent from direct sharing', () => {
  const template = read('miniprogram/packageCard/pages/share/index.wxml');
  const source = read('miniprogram/packageCard/pages/share/index.ts');

  assert.match(template, /名片海报与入口管理/);
  assert.match(template, /此页独立管理名片海报、限时入口与撤销记录/);
  assert.match(template, /直接转发请从名片页唤起微信面板/);
  assert.match(template, /微信转发封面（可选）/);
  assert.match(template, />移除本机撤销记录<\/button>/);
  assert.match(source, /title: '移除本机撤销记录？'/);
  assert.match(source, /这不会真正撤销已创建的入口/);
  assert.match(source, /只移除了本机撤销记录，并不代表入口已经撤销/);
  const revokeFlow = source.slice(source.indexOf('async revokeShare()'), source.indexOf('handleShareRetry()'));
  const localRemovalFlow = source.slice(source.indexOf('clearLocalRevocationPointer()'), source.indexOf('async generatePoster()'));
  assert.match(revokeFlow, /revokeConfirmed[\s\S]*markShareRevokedForSession\(tokenId\)[\s\S]*forgetShareRevocationPointer\(tokenId\)/);
  assert.doesNotMatch(localRemovalFlow, /markShareRevokedForSession/);
  assert.doesNotMatch(`${template}\n${source}`, /清除|清楚|克制|好友|人脉/);
});

test('assigned public event copy avoids rejected wording', () => {
  const publicCopy = [
    read('miniprogram/pages/events/index.wxml'),
    read('miniprogram/components/ab-event-card/demo-data.ts'),
  ].join('\n');

  assert.match(publicCopy, /精选商业对话/);
  assert.match(publicCopy, /从容而深入的跨界对话/);
  assert.match(publicCopy, /雅致餐叙视觉参考/);
  assert.doesNotMatch(publicCopy, /清除|清楚|克制|好友|人脉/);
});

test('share management keeps high-contrast dark-mode button colors local to the page', () => {
  const styles = read('miniprogram/packageCard/pages/share/index.wxss');
  const darkStart = styles.indexOf('@media (prefers-color-scheme: dark)');
  const narrowStart = styles.indexOf('@media (max-width: 340px)');
  assert.ok(darkStart >= 0 && narrowStart > darkStart);
  const darkMode = styles.slice(darkStart, narrowStart);

  assert.match(darkMode, /\.share-page \.card-button[\s\S]*?background:\s*#dec89c;[\s\S]*?color:\s*#211e1a;/);
  assert.match(darkMode, /\.share-page \.card-button-secondary[\s\S]*?color:\s*#fffaf0;/);
  assert.match(darkMode, /\.share-page \.card-button\[disabled\][\s\S]*?background:\s*#3a352f;[\s\S]*?color:\s*#d7cec1;[\s\S]*?opacity:\s*1;/);
});
