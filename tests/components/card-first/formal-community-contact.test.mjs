import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { readFileSync } from 'node:fs';

const root = resolve(import.meta.dirname, '../../..');
const asset = '/assets/community/european-classical-terrace.jpg';
const storageKey = 'ab.club.local-identity.v1';
const bundled = await build({
  entryPoints: [resolve(root, 'miniprogram/pages/me/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'es2020',
  write: false,
  logLevel: 'silent',
});

function createMePage({ identity = null, clipboardThrows = false } = {}) {
  let definition;
  const clipboardCalls = [];
  const toasts = [];
  const storageWrites = [];
  runInNewContext(bundled.outputFiles[0].text, {
    Page(candidate) { definition = candidate; },
    getApp: () => ({ globalData: { runtimeMode: 'OFFLINE_DEMO', cloudEnvironmentConfigured: false } }),
    wx: {
      getStorageSync(key) { return key === storageKey ? identity : undefined; },
      setStorageSync(key, value) { storageWrites.push({ key, value }); },
      setClipboardData(options) {
        if (clipboardThrows) throw new Error('clipboard unavailable');
        clipboardCalls.push(options);
      },
      showToast(options) { toasts.push(options); },
      stopPullDownRefresh() {},
    },
  });
  assert.ok(definition, 'the real Me page must register');
  const page = {
    ...definition,
    data: structuredClone(definition.data),
    setData(patch) { Object.assign(this.data, patch); },
  };
  page.onLoad();
  return { page, clipboardCalls, toasts, storageWrites };
}

test('community artwork and all thirteen city names remain visible before a profile exists', async () => {
  const { page, storageWrites } = createMePage();
  await page.loadProfile();
  assert.equal(page.data.status, 'READY');
  assert.equal(page.data.profile, null);
  assert.equal(page.data.hasProfileCity, false);
  assert.equal(page.data.cityImageSrc, asset);
  assert.equal(page.data.cityGroupTitle, 'AB Club 支持的城市清单');
  assert.deepEqual([...page.data.supportedCityNames], [
    '北京', '上海', '广州', '深圳', '杭州', '苏黎世', '米兰',
    '巴黎', '墨尔本', '悉尼', '新加坡', '多伦多', '温哥华',
  ]);
  assert.equal(page.data.communityWechatId, 'ABclub1');
  assert.deepEqual(storageWrites, [], 'viewing contact information must not manufacture a registration or group application');
});

test('changing the profile city preserves the European community image and the user profile', async () => {
  for (const [cityId, cityName] of [['cn-hangzhou', '杭州'], ['ch-zurich', '苏黎世'], ['ca-vancouver', '温哥华']]) {
    const { page } = createMePage({ identity: {
      contractVersion: 1,
      displayName: '审查测试人物',
      cityId,
      profession: '策展人',
      biography: '艺术与文化交流',
      selectedLabels: ['艺术'],
      showTags: true,
      registeredAt: '2026-09-11T00:00:00.000Z',
    } });
    await page.loadProfile();
    assert.equal(page.data.profile.displayName, '审查测试人物');
    assert.equal(page.data.cityName, cityName);
    assert.equal(page.data.hasProfileCity, true);
    assert.equal(page.data.cityImageSrc, asset);
    assert.equal(page.data.supportedCityNames.length, 13);
    page.handleCityImageError();
    assert.equal(page.data.cityImageFailed, true, 'a failed image enables the shipped crest fallback');
    assert.equal(page.data.communityWechatId, 'ABclub1', 'contact remains available when the image fails');
  }
});

test('copying the operator contact de-duplicates pending taps and reports success only after the callback', () => {
  const { page, clipboardCalls, toasts, storageWrites } = createMePage();
  page.copyCommunityWechat();
  page.copyCommunityWechat();
  assert.equal(clipboardCalls.length, 1);
  assert.equal(clipboardCalls[0].data, 'ABclub1');
  assert.equal(page.data.copyingCommunityWechat, true);
  assert.equal(toasts.length, 0, 'requesting clipboard access is not evidence of success');
  clipboardCalls[0].success();
  assert.equal(toasts.at(-1).title, '微信号已复制');
  assert.equal(toasts.at(-1).icon, 'success');
  clipboardCalls[0].complete();
  assert.equal(page.data.copyingCommunityWechat, false);
  page.copyCommunityWechat();
  assert.equal(clipboardCalls.length, 2, 'another tap is allowed after the previous request completes');
  assert.deepEqual(storageWrites, [], 'copying the contact must not claim a joined group');
});

test('failed clipboard requests release the button and offer a manual copy fallback without success claims', () => {
  const { page, clipboardCalls, toasts } = createMePage();
  page.copyCommunityWechat();
  clipboardCalls[0].fail();
  clipboardCalls[0].complete();
  assert.equal(page.data.copyingCommunityWechat, false);
  assert.equal(toasts.at(-1).icon, 'none');
  assert.match(toasts.at(-1).title, /长按微信号复制/);
  assert.ok(toasts.every((toast) => !/已复制|成功|已加入|已提交/.test(toast.title)));
  page.copyCommunityWechat();
  assert.equal(clipboardCalls.length, 2);
});

test('synchronous clipboard errors also restore the contact button', () => {
  const { page, toasts } = createMePage({ clipboardThrows: true });
  assert.doesNotThrow(() => page.copyCommunityWechat());
  assert.equal(page.data.copyingCommunityWechat, false);
  assert.equal(toasts.at(-1).icon, 'none');
  assert.match(toasts.at(-1).title, /长按微信号复制/);
  assert.ok(toasts.every((toast) => !/已复制|成功|已加入|已提交/.test(toast.title)));
});

test('the frosted contact button retains high contrast without blur support in light and dark mode', () => {
  const styles = readFileSync(resolve(root, 'miniprogram/pages/me/index.wxss'), 'utf8');
  const rules = [...styles.matchAll(/\.me-city-group__copy-button\s*\{([^}]+)\}/g)].map((match) => match[1]);
  const colorRules = rules.filter((rule) => /background-color:/.test(rule));
  assert.equal(colorRules.length, 2, 'light and dark backgrounds should be explicit');
  const luminance = (rgb) => rgb.map((value) => value / 255).map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  for (const rule of colorRules) {
    const background = rule.match(/background-color:\s*rgba\(([^)]+)\)/)?.[1].split(',').map(Number);
    const textHex = rule.match(/(?:^|;)\s*color:\s*#([0-9a-f]{6})/i)?.[1];
    assert.ok(background?.length === 4 && textHex);
    const foreground = [0, 2, 4].map((offset) => Number.parseInt(textHex.slice(offset, offset + 2), 16));
    for (const underlying of [0, 255]) {
      const composite = background.slice(0, 3).map((value) => value * background[3] + underlying * (1 - background[3]));
      const contrast = (luminance(composite) + 0.05) / (luminance(foreground) + 0.05);
      assert.ok(contrast >= 4.5, `fallback contrast ${contrast.toFixed(2)} must remain readable`);
    }
  }
  assert.match(rules[0], /border:\s*1rpx solid/);
  assert.match(rules[0], /box-shadow:\s*inset/);
  assert.match(rules[0], /backdrop-filter:\s*blur\(16px\)/);
  assert.match(styles, /prefers-reduced-motion: reduce[\s\S]*?\.me-city-group__copy-button[\s\S]*?transition: none/);
});
