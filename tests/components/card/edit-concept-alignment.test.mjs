import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (path) => readFileSync(resolve(repoRoot, path), 'utf8');

function cssRule(styles, selector, expectedDeclaration) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = [...styles.matchAll(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'g'))];
  assert.ok(matches.length, `缺少 ${selector} 样式规则`);
  const match = expectedDeclaration
    ? matches.find((candidate) => expectedDeclaration.test(candidate[1]))
    : matches[0];
  assert.ok(match, `${selector} 缺少预期声明 ${expectedDeclaration}`);
  return match[1];
}

test('card editor follows the approved one-template high-control concept', () => {
  const template = read('miniprogram/packageCard/pages/edit/index.wxml');
  const source = read('miniprogram/packageCard/pages/edit/index.ts');
  const styles = read('miniprogram/packageCard/pages/edit/index.wxss');

  assert.match(template, /自由填写内容/, '编辑器应以自由文字为核心，而不是固定简历字段表');
  assert.doesNotMatch(template, />教育背景</, '教育背景不应继续作为固定必填式分区');
  assert.match(template, /卡片配色/);
  for (const theme of ['象牙白', '墨黑', '香槟金', '石灰灰']) {
    assert.match(`${template}\n${source}`, new RegExp(theme));
  }

  const expectedLabels = [
    '海归', '985/211', 'MBA', '创始人', '企业家', '接班二代', '投资人', '知名博主',
    '艺术家', '收藏家', '艺术爱好者', '古董爱好者', '珍珠爱好者', '红酒品鉴',
    '高尔夫', '旅行爱好者', '读书爱好者', '电影爱好者', '美食爱好者', '音乐爱好者',
  ];
  for (const label of expectedLabels) assert.match(source, new RegExp(label.replace('/', '\\/')));

  assert.match(template, /bindtap="toggleProfileTag"/);
  assert.match(template, /bindtap="chooseGalleryImages"/);
  assert.match(template, /标签与图片.*仅.*预览/, '不能把尚未持久化的标签和图片冒充已保存');
  assert.equal((template.match(/aria-role="tab"/g) ?? []).length, 2, '两个编辑视图都应声明为 tab');
  assert.match(styles, /\.card-editor-tab[\s\S]*min-height:\s*var\(--ab-touch-target\)/);
  assert.match(styles, /\.card-editor-ai[\s\S]*min-height:\s*var\(--ab-touch-target\)/);
});

test('card editor theme control matches the approved live-preview geometry', () => {
  const template = read('miniprogram/packageCard/pages/edit/index.wxml');
  const styles = read('miniprogram/packageCard/pages/edit/index.wxss');

  assert.match(template, /class="card-theme-live card-theme-live--\{\{cardTheme\}\}"/);
  assert.match(template, /aria-label="当前名片配色实时预览"/);
  assert.match(template, /class="card-theme-options"[\s\S]*?wx:for="\{\{themeOptions\}\}"[\s\S]*?bindtap="selectCardTheme"/);

  assert.match(cssRule(styles, '.card-theme-options', /gap:\s*8rpx/), /gap:\s*8rpx/);
  const themeOptionRule = cssRule(styles, '.card-theme-option', /border:\s*0/);
  assert.match(themeOptionRule, /min-height:\s*100rpx/);
  assert.match(themeOptionRule, /background:\s*transparent/);
  assert.doesNotMatch(themeOptionRule, /(?:^|\n)\s*(?:border:\s*[1-9]\d*rpx|box-shadow\s*:)/);
  const swatchRule = cssRule(styles, '.card-theme-option__swatch', /height:\s*46rpx/);
  assert.match(swatchRule, /width:\s*46rpx/);
  assert.match(swatchRule, /border-radius:\s*50%/);
  assert.match(styles, /\.card-theme-option--selected \.card-theme-option__swatch\s*\{[\s\S]*?box-shadow:/);

  assert.equal((template.match(/class="card-editor-workspace"/g) ?? []).length, 1, '编辑态应使用一个大面板');
  assert.ok((template.match(/class="card-editor-section(?:\s|\")/g) ?? []).length >= 5, '大面板内应用分隔区段组织内容');
  assert.match(cssRule(styles, '.card-editor-workspace', /border-radius:\s*28rpx/), /border-radius:\s*28rpx/);
  const sectionRule = cssRule(styles, '.card-editor-section');
  assert.match(sectionRule, /border-top:\s*2rpx\s+solid/);
  assert.doesNotMatch(sectionRule, /border-radius|background\s*:/, '子分区不应重新切成多张浮层卡片');

  assert.doesNotMatch(styles, /color-mix\s*\(/i, 'WXSS 不依赖 color-mix');
  assert.doesNotMatch(styles, /background(?:-image)?\s*:\s*url\s*\(/i, '品牌图标应使用本地 image 节点');
});

test('theme preference is written by edit and restored across owner, preview, and share card surfaces', () => {
  const service = read('miniprogram/pages/card/services/card-theme-preference.ts');
  const editor = read('miniprogram/packageCard/pages/edit/index.ts');
  const card = read('miniprogram/pages/card/index.ts');
  const cardTemplate = read('miniprogram/pages/card/index.wxml');
  const view = read('miniprogram/packageCard/pages/view/index.ts');
  const viewTemplate = read('miniprogram/packageCard/pages/view/index.wxml');
  const share = read('miniprogram/packageCard/pages/share/index.ts');
  const shareTemplate = read('miniprogram/packageCard/pages/share/index.wxml');
  const discoverTemplate = read('miniprogram/pages/discover/index.wxml');

  for (const theme of ['ivory', 'ink', 'champagne', 'stone']) assert.match(service, new RegExp(`'${theme}'`));
  assert.match(service, /wx\.getStorageSync\(CARD_THEME_STORAGE_KEY\)/);
  assert.match(service, /wx\.setStorageSync\(CARD_THEME_STORAGE_KEY,\s*normalizeCardTheme\(theme\)\)/);

  assert.match(editor, /readCardThemePreference\(\)/);
  assert.match(editor, /selectCardTheme\([\s\S]*?writeCardThemePreference\(theme as CardTheme\)/);
  assert.match(card, /onShow\(\)[\s\S]*?readCardThemePreference\(\)[\s\S]*?setData\(\{ cardTheme \}\)/);
  assert.match(cardTemplate, /theme="\{\{cardTheme\}\}"/);
  assert.match(view, /cardTheme:\s*readCardThemePreference\(\)/);
  assert.match(viewTemplate, /theme="\{\{cardTheme\}\}"/);
  assert.match(share, /const cardTheme = readCardThemePreference\(\)/);
  assert.match(shareTemplate, /theme="\{\{cardTheme\}\}"/);
  assert.doesNotMatch(discoverTemplate, /<ab-profile-card\b|discover-card--\{\{cardTheme\}\}/);
});
