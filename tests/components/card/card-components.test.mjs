import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

// This suite exercises isolated custom components. It is intentionally not described as page E2E.
const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(testDirectory, '../../..');
const componentRoot = join(repositoryRoot, 'miniprogram/components');
const localRequire = createRequire(import.meta.url);

const read = (relativePath) => readFileSync(join(repositoryRoot, relativePath), 'utf8');

function loadOptionalModule(explicitPath, packageName) {
  const request = explicitPath?.trim() || packageName;
  try {
    return { module: localRequire(request), error: '' };
  } catch (error) {
    return {
      module: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function exposeDomWindow(domWindow) {
  for (const [name, value] of Object.entries({
    window: domWindow,
    self: domWindow,
    document: domWindow.document,
    navigator: domWindow.navigator,
    location: domWindow.location,
    Node: domWindow.Node,
    Element: domWindow.Element,
    HTMLElement: domWindow.HTMLElement,
    CustomEvent: domWindow.CustomEvent,
    Event: domWindow.Event,
    MutationObserver: domWindow.MutationObserver,
    getComputedStyle: domWindow.getComputedStyle.bind(domWindow),
  })) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
}

function initializeSimulator() {
  if (!globalThis.document) {
    const jsdom = loadOptionalModule(process.env.MINIPROGRAM_JSDOM_PATH, 'jsdom');
    if (!jsdom.module?.JSDOM) {
      return {
        simulate: null,
        reason: `jsdom unavailable: ${jsdom.error || 'module has no JSDOM export'}`,
      };
    }
    exposeDomWindow(new jsdom.module.JSDOM('<!doctype html><html><body></body></html>', {
      url: 'https://component.test/',
    }).window);
  }

  const simulator = loadOptionalModule(
    process.env.MINIPROGRAM_SIMULATE_PATH,
    'miniprogram-simulate',
  );
  const simulate = simulator.module?.default ?? simulator.module;
  if (!simulate?.load || !simulate?.render) {
    return {
      simulate: null,
      reason: `miniprogram-simulate unavailable: ${simulator.error || 'module has no load/render API'}`,
    };
  }
  return { simulate, reason: '' };
}

const simulatorRuntime = initializeSimulator();
const simulatorRequired = process.env.REQUIRE_MINIPROGRAM_SIMULATE === '1';
const simulatorSkip = simulatorRuntime.simulate
  ? false
  : simulatorRequired
    ? false
    : `UNVERIFIED: ${simulatorRuntime.reason}`;
const componentTest = simulatorRuntime.simulate ? test : test.skip;

let temporaryFixtureRoot = '';
let loadedComponents;

function bundleComponent(componentName) {
  const sourceDirectory = join(componentRoot, componentName);
  const destinationDirectory = join(temporaryFixtureRoot, componentName);
  mkdirSync(destinationDirectory, { recursive: true });

  buildSync({
    entryPoints: [join(sourceDirectory, 'index.ts')],
    outfile: join(destinationDirectory, 'index.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2019'],
    logLevel: 'silent',
  });
  for (const extension of ['wxml', 'wxss', 'json']) {
    copyFileSync(
      join(sourceDirectory, `index.${extension}`),
      join(destinationDirectory, `index.${extension}`),
    );
  }
  return join(destinationDirectory, 'index');
}

function ensureLoadedComponents() {
  if (loadedComponents) return loadedComponents;
  const simulate = simulatorRuntime.simulate;
  assert.ok(simulate, simulatorRuntime.reason);

  temporaryFixtureRoot = mkdtempSync(join(tmpdir(), 'ab-card-components-'));
  const profilePath = bundleComponent('ab-profile-card');
  const privacyPath = bundleComponent('ab-privacy-field');
  const shareStatePath = bundleComponent('ab-share-state');

  const verifiedTagStub = simulate.load({
    tagName: 'ab-verified-tag-stub',
    template: '<view class="verified-tag-stub">{{label}}</view>',
    properties: {
      label: { type: String, value: '' },
      reviewStatus: { type: String, value: '' },
      verificationState: { type: String, value: '' },
    },
  });

  loadedComponents = {
    profile: simulate.load(profilePath, 'ab-profile-card', {
      compiler: 'simulate',
      rootPath: temporaryFixtureRoot,
      usingComponents: { 'ab-verified-tag': verifiedTagStub },
    }),
    privacy: simulate.load(privacyPath, 'ab-privacy-field', {
      compiler: 'simulate',
      rootPath: temporaryFixtureRoot,
    }),
    shareState: simulate.load(shareStatePath, 'ab-share-state', {
      compiler: 'simulate',
      rootPath: temporaryFixtureRoot,
    }),
  };
  return loadedComponents;
}

process.once('exit', () => {
  if (temporaryFixtureRoot) rmSync(temporaryFixtureRoot, { recursive: true, force: true });
});

test('card component exports are native isolated components', () => {
  for (const componentName of ['ab-profile-card', 'ab-privacy-field', 'ab-share-state']) {
    const componentJson = JSON.parse(read(`miniprogram/components/${componentName}/index.json`));
    assert.equal(componentJson.component, true);
    assert.ok(read(`miniprogram/components/${componentName}/index.ts`).includes('Component({'));
    assert.ok(read(`miniprogram/components/${componentName}/index.wxml`).length > 0);
    assert.ok(read(`miniprogram/components/${componentName}/index.wxss`).length > 0);
  }
});

test('profile card consumes the shared verified tag and does not grant claims itself', () => {
  const source = read('miniprogram/components/ab-profile-card/index.ts');
  const template = read('miniprogram/components/ab-profile-card/index.wxml');
  const config = JSON.parse(read('miniprogram/components/ab-profile-card/index.json'));

  assert.equal(config.usingComponents['ab-verified-tag'], '../ab-verified-tag/index');
  assert.match(template, /<ab-verified-tag/);
  assert.match(source, /ReviewStatus\.APPROVED/);
  assert.match(source, /VerificationState\.HUMAN_REVIEWED/);
  assert.match(source, /publicVisible !== true/);
  assert.match(source, /!Number\.isFinite\(validFrom\) \|\| validFrom > now/);
  assert.match(source, /validUntil <= now/);
  assert.doesNotMatch(source, /reviewStatus\s*:\s*['"]APPROVED['"]/);
  assert.doesNotMatch(template, /<t-tag[^>]*人工审核/);
});

test('profile card renders only normalized allow-listed fields and keeps owner review state private', () => {
  const source = read('miniprogram/components/ab-profile-card/index.ts');
  const template = read('miniprogram/components/ab-profile-card/index.wxml');

  for (const field of ['industry', 'company', 'position', 'experience', 'interests']) {
    assert.match(source, new RegExp(`${field}:`));
  }
  assert.match(source, /ALLOWED_CARD_FIELD_KEYS/);
  assert.match(template, /wx:if="\{\{isSelf && \(safePendingLabels\.length \|\| safeRejectedLabels\.length\)\}\}"/);
  assert.doesNotMatch(template, /\{\{\s*card\./);
  assert.doesNotMatch(template, /\{\{\s*fields\[/);
  assert.match(template, /safeFields/);
});

test('privacy field uses the frozen Visibility enum and explains all three meanings without guessing UNKNOWN', () => {
  const source = read('miniprogram/components/ab-privacy-field/index.ts');
  const template = read('miniprogram/components/ab-privacy-field/index.wxml');

  assert.match(source, /from '\.\.\/\.\.\/shared\/types\/enums'/);
  for (const visibility of ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE']) {
    assert.match(source, new RegExp(`Visibility\\.${visibility}`));
  }
  assert.match(source, /selectedVisibility:\s*''/);
  assert.match(template, /当前可见性未读取/);
  assert.match(source, /删除好友或关系失效后，刷新即收回/);
  assert.match(source, /不会进入公开名片、分享 query、小程序码 scene 或海报内容/);
});

test('component events expose no profile values, tokens, identifiers, or media URLs', () => {
  const profileSource = read('miniprogram/components/ab-profile-card/index.ts');
  const privacySource = read('miniprogram/components/ab-privacy-field/index.ts');
  const shareSource = read('miniprogram/components/ab-share-state/index.ts');

  assert.match(profileSource, /triggerEvent\('edit'\)/);
  assert.match(profileSource, /triggerEvent\('share'\)/);
  assert.match(profileSource, /triggerEvent\('avatarerror'\)/);
  assert.match(read('miniprogram/components/ab-profile-card/index.wxml'), /bindtap="handleEdit"/);
  assert.match(read('miniprogram/components/ab-profile-card/index.wxml'), /bindtap="handleShare"/);
  assert.doesNotMatch(profileSource, /triggerEvent\([^)]*(?:avatarUrl|biography|displayName|cardId)/s);
  assert.match(privacySource, /fieldKey:\s*this\.properties\.fieldKey,\s*visibility/s);
  assert.match(read('miniprogram/components/ab-privacy-field/index.wxml'), /bindtap="handleSelect"/);
  assert.doesNotMatch(privacySource, /triggerEvent\([^)]*(?:value|phone|openid|token|url)/is);
  assert.match(shareSource, /triggerEvent\('retry', \{ state: this\.data\.safeState \}\)/);
  assert.match(shareSource, /triggerEvent\('forward', \{ state: this\.data\.safeState \}\)/);
  assert.doesNotMatch(shareSource, /triggerEvent\([^)]*(?:token|query|scene|profile|openid|url)/is);
});

test('share states distinguish success, expiry, revocation and failure without fabricated success', () => {
  const source = read('miniprogram/components/ab-share-state/index.ts');
  const template = read('miniprogram/components/ab-share-state/index.wxml');

  for (const state of ['SUCCESS', 'EXPIRED', 'REVOKED', 'ERROR']) {
    assert.match(source, new RegExp(`${state}:`));
  }
  assert.match(source, /是否真正发送由微信界面确认/);
  assert.match(source, /只有微信确认后才算真正转发/);
  assert.match(source, /retryTimers = new WeakMap/);
  assert.match(source, /clearTimeout\(timer\)/);
  assert.match(source, /assistText: this\.properties\.busy \? '正在处理，请稍候。' : ''/);
  assert.match(template, /bindtap="handleRetry"/);
  assert.match(template, /bindtap="handleForward"/);
  assert.match(template, /open-type="share"/);
});

test('AB Club component styles avoid prohibited visual patterns and protect overflow', () => {
  const styles = [
    read('miniprogram/components/ab-profile-card/index.wxss'),
    read('miniprogram/components/ab-privacy-field/index.wxss'),
    read('miniprogram/components/ab-share-state/index.wxss'),
  ].join('\n');

  assert.match(styles, /var\(--ab-color-green\)/);
  assert.match(styles, /var\(--ab-color-gold-soft\)/);
  assert.match(styles, /overflow-wrap:\s*anywhere/);
  assert.match(styles, /minmax\(0, 1fr\)/);
  assert.doesNotMatch(styles, /(?:linear|radial)-gradient|backdrop-filter|box-shadow/i);
  assert.doesNotMatch(styles, /#(?:7c3aed|8b5cf6|a855f7)/i);
});

test('miniprogram-simulate execution gate', { skip: simulatorSkip }, () => {
  assert.ok(simulatorRuntime.simulate, simulatorRuntime.reason);
});

componentTest('miniprogram-simulate covers profile properties, safe projection and events', () => {
  const simulate = simulatorRuntime.simulate;
  assert.ok(simulate);
  const { profile } = ensureLoadedComponents();
  const component = simulate.render(profile, {
    card: {
      displayName: '艾伯特·A-Name-With-An-Intentionally-Very-Long-Suffix-用于验证中英文长姓名不会破版',
      headline: '全球制造与文化交流',
      cityId: 'city-shenzhen',
      avatarUrl: '',
      biography: '坚持长期主义。',
      claims: [
        {
          claimId: 'claim-approved',
          labelText: { zh: '人工认证会员', en: 'Verified member' },
          reviewStatus: 'APPROVED',
          verificationState: 'HUMAN_REVIEWED',
          publicVisible: true,
          validFrom: '2020-01-01T00:00:00.000Z',
        },
        {
          claimId: 'claim-ai-only',
          labelText: { zh: 'AI 自述' },
          reviewStatus: 'APPROVED',
          verificationState: 'AI_CONSISTENCY_CHECKED',
          publicVisible: true,
          validFrom: '2020-01-01T00:00:00.000Z',
        },
        {
          claimId: 'claim-missing-valid-from',
          labelText: { zh: '缺少生效时间' },
          reviewStatus: 'APPROVED',
          verificationState: 'HUMAN_REVIEWED',
          publicVisible: true,
        },
      ],
    },
    viewerMode: 'SELF',
    fields: [
      { key: 'industry', label: '行业', value: '先进制造' },
      { key: 'phone', label: '手机号', value: '13800000000' },
      { key: 'interests', label: '兴趣', value: ['艺术', '徒步'] },
    ],
    pendingLabels: ['行业资历'],
    rejectedLabels: ['旧标签'],
    maxVisibleClaims: 1,
  });
  component.attach(document.createElement('div'));

  assert.equal(component.data.safeViewerMode, 'SELF');
  assert.equal(component.data.isSelf, true);
  assert.equal(component.data.safeClaims.length, 1);
  assert.deepEqual(component.data.safeFields.map((field) => field.key), ['industry', 'interests']);
  assert.doesNotMatch(component.dom.textContent, /13800000000/);
  assert.match(component.dom.textContent, /审核中/);

  let editCount = 0;
  let shareCount = 0;
  component.addEventListener('edit', () => { editCount += 1; });
  component.addEventListener('share', () => { shareCount += 1; });
  // miniprogram-simulate exposes the component instance for deterministic custom-event testing.
  // Template binding presence is asserted separately above because its built-in button is a DOM stub.
  component.instance.handleEdit();
  component.instance.handleShare();
  assert.equal(editCount, 1);
  assert.equal(shareCount, 1);
  component.detach();
});

componentTest('miniprogram-simulate covers empty card and image-failure fallback', () => {
  const simulate = simulatorRuntime.simulate;
  assert.ok(simulate);
  const { profile } = ensureLoadedComponents();

  const empty = simulate.render(profile, { card: null, viewerMode: 'STRANGER' });
  empty.attach(document.createElement('div'));
  assert.equal(empty.data.hasCard, false);
  assert.match(empty.dom.textContent, /名片暂不可用/);
  empty.detach();

  const brokenAvatar = simulate.render(profile, {
    card: {
      displayName: 'Long-English-Name-With-中文混排-用于失败头像回退验证',
      avatarUrl: 'https://cdn.example.test/missing-avatar.jpg',
      claims: [],
    },
    viewerMode: 'FRIEND',
  });
  brokenAvatar.attach(document.createElement('div'));
  let avatarErrorCount = 0;
  brokenAvatar.addEventListener('avatarerror', () => { avatarErrorCount += 1; });
  brokenAvatar.instance.handleAvatarError();
  brokenAvatar.instance.handleAvatarError();
  assert.equal(brokenAvatar.data.avatarFailed, true);
  assert.equal(avatarErrorCount, 1);
  assert.match(brokenAvatar.dom.textContent, /Long-English-Name-With/);
  brokenAvatar.detach();
});

componentTest('miniprogram-simulate covers privacy UNKNOWN, properties and safe change event', () => {
  const simulate = simulatorRuntime.simulate;
  assert.ok(simulate);
  const { privacy } = ensureLoadedComponents();

  const unknown = simulate.render(privacy, {
    fieldKey: 'company',
    label: '公司',
    visibility: 'UNKNOWN',
    disabled: true,
  });
  unknown.attach(document.createElement('div'));
  assert.equal(unknown.data.visibilityKnown, false);
  assert.equal(unknown.data.selectedVisibility, '');
  assert.match(unknown.dom.textContent, /当前可见性未读取/);
  unknown.detach();

  const editable = simulate.render(privacy, {
    fieldKey: 'company',
    label: '公司',
    visibility: 'PUBLIC',
  });
  editable.attach(document.createElement('div'));
  let eventDetail;
  editable.addEventListener('change', (event) => { eventDetail = event.detail; });
  assert.equal(editable.querySelectorAll('.privacy-field__option').length, 3);
  editable.instance.handleSelect({
    currentTarget: { dataset: { visibility: 'FRIENDS_ONLY' } },
  });
  assert.deepEqual(eventDetail, { fieldKey: 'company', visibility: 'FRIENDS_ONLY' });
  assert.equal(editable.data.selectedVisibility, 'FRIENDS_ONLY');
  editable.detach();
});

componentTest('miniprogram-simulate covers retry de-duplication and forward honesty', () => {
  const simulate = simulatorRuntime.simulate;
  assert.ok(simulate);
  const { shareState } = ensureLoadedComponents();
  const component = simulate.render(shareState, {
    state: 'ERROR',
    allowRetry: true,
    allowForward: true,
  });
  component.attach(document.createElement('div'));

  let retryCount = 0;
  let forwardCount = 0;
  let retryDetail;
  component.addEventListener('retry', (event) => {
    retryCount += 1;
    retryDetail = event.detail;
  });
  component.addEventListener('forward', () => { forwardCount += 1; });
  component.instance.handleRetry();
  component.instance.handleRetry();
  component.instance.handleForward();

  assert.equal(retryCount, 1);
  assert.deepEqual(retryDetail, { state: 'ERROR' });
  assert.equal(forwardCount, 1);
  assert.match(component.data.assistText, /微信确认后才算真正转发/);
  component.detach();
});

componentTest('miniprogram-simulate projects named slots through all exported components', () => {
  const simulate = simulatorRuntime.simulate;
  assert.ok(simulate);
  const { profile, privacy, shareState } = ensureLoadedComponents();
  const wrapperId = simulate.load({
    template: `
      <profile-probe card="{{card}}" viewer-mode="FRIEND" show-default-actions="{{false}}">
        <view slot="actions" class="profile-slot">PROFILE_SLOT</view>
      </profile-probe>
      <privacy-probe field-key="biography" label="介绍" visibility="PRIVATE">
        <view slot="editor" class="privacy-slot">PRIVACY_SLOT</view>
      </privacy-probe>
      <share-probe state="SUCCESS">
        <view slot="detail" class="share-slot">SHARE_SLOT</view>
      </share-probe>
    `,
    data: {
      card: { displayName: 'Slot Member', claims: [] },
    },
    usingComponents: {
      'profile-probe': profile,
      'privacy-probe': privacy,
      'share-probe': shareState,
    },
  });
  const wrapper = simulate.render(wrapperId);
  wrapper.attach(document.createElement('div'));

  assert.match(wrapper.dom.textContent, /PROFILE_SLOT/);
  assert.match(wrapper.dom.textContent, /PRIVACY_SLOT/);
  assert.match(wrapper.dom.textContent, /SHARE_SLOT/);
  wrapper.detach();
});
