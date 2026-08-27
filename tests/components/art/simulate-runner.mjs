import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test, { after } from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const temporaryRoot = mkdtempSync(join(tmpdir(), 'ab-art-simulate-'));
const temporaryMini = join(temporaryRoot, 'miniprogram');
const require = createRequire(import.meta.url);

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://art-components.test.invalid/',
  pretendToBeVisual: true,
});

for (const key of [
  'window', 'document', 'navigator', 'Node', 'Element', 'HTMLElement', 'Text',
  'Event', 'CustomEvent', 'MutationObserver', 'getComputedStyle',
]) {
  const value = key === 'window' ? dom.window : key === 'document' ? dom.window.document : dom.window[key];
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}
globalThis.self = dom.window;
globalThis.wx = Object.create(null);
dom.window.wx = globalThis.wx;

const simulate = require('miniprogram-simulate');
const sourceComponents = [
  ['components', 'ab-art-card'],
  ['components', 'ab-content-source'],
  ['components', 'ab-provenance-summary'],
  ['components', 'ab-intent-action'],
  ['packageArt', 'components', 'art-page-state'],
];

const typeScriptSources = [];
function stageComponent(parts) {
  const sourceDirectory = join(root, 'miniprogram', ...parts);
  const targetDirectory = join(temporaryMini, ...parts);
  mkdirSync(targetDirectory, { recursive: true });

  for (const extension of ['json', 'wxml', 'wxss']) {
    const source = join(sourceDirectory, `index.${extension}`);
    assert.equal(existsSync(source), true, `${parts.join('/')} must include index.${extension}`);
    copyFileSync(source, join(targetDirectory, `index.${extension}`));
  }

  const typeScriptSource = join(sourceDirectory, 'index.ts');
  assert.equal(existsSync(typeScriptSource), true, `${parts.join('/')} must include index.ts`);
  typeScriptSources.push(typeScriptSource);
}

sourceComponents.forEach(stageComponent);
const compilerConfig = join(temporaryRoot, 'tsconfig.json');
writeFileSync(compilerConfig, `${JSON.stringify({
  compilerOptions: {
    target: 'ES2020',
    module: 'CommonJS',
    rootDir: join(root, 'miniprogram'),
    outDir: temporaryMini,
    noCheck: true,
    skipLibCheck: true,
  },
  files: typeScriptSources,
}, null, 2)}\n`, 'utf8');
const compiler = join(here, 'node_modules', 'typescript', 'bin', 'tsc');
const compilation = spawnSync(process.execPath, [compiler, '-p', compilerConfig], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
});
assert.equal(
  compilation.status,
  0,
  `temporary component compilation failed: ${compilation.stderr || compilation.stdout}`,
);

const componentIds = new Map();
function componentId(parts, tagName) {
  const key = parts.join('/');
  if (!componentIds.has(key)) {
    componentIds.set(key, simulate.load(
      join(temporaryMini, ...parts, 'index'),
      tagName,
      { compiler: 'simulate', rootPath: temporaryMini },
    ));
  }
  return componentIds.get(key);
}

function render(parts, tagName, properties) {
  const component = simulate.render(componentId(parts, tagName), properties);
  component.attach(document.body);
  return component;
}

const nextEventLoop = async () => {
  await Promise.resolve();
  await simulate.sleep(0);
};

after(() => {
  document.body.replaceChildren();
  dom.window.close();
  rmSync(temporaryRoot, { recursive: true, force: true });
});

test('ab-art-card renders very long bilingual text and emits select from its bound tap', async () => {
  const title = '一条用于验证极端换行、连续英文单词与中英文混排的超长艺术内容标题 — A Deliberately Extensive Editorial Headline Without Trading Claims';
  const summary = '这是不会被截断成模糊交易入口的长摘要。It preserves provenance labels, city context and evidence scope while remaining readable.';
  const card = render(['components', 'ab-art-card'], 'ab-art-card', {
    contentId: 'content_demo_long_title',
    title,
    summary,
    categoryLabel: '艺术 / ART',
    creatorName: 'Synthetic Creator',
    cityName: '上海 / Shanghai',
    recordOrigin: 'SYNTHETIC',
    evidenceScope: 'DEMO_ONLY',
    imageUrl: '',
    alt: '无公开图片，显示非作品占位状态',
    imageAllowed: false,
  });
  try {
    assert.equal(card.data.showImage, false);
    assert.equal(Boolean(card.querySelector('.art-card__image')), false);
    assert.match(card.dom.textContent, new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(card.dom.textContent, /暂无可公开展示的图片/);
    assert.match(card.dom.textContent, /SYNTHETIC/);
    assert.match(card.dom.textContent, /DEMO_ONLY/);

    let selected;
    card.addEventListener('select', (event) => { selected = event.detail; });
    card.querySelector('.art-card').dispatchEvent('tap');
    await nextEventLoop();
    assert.deepEqual(selected, { contentId: 'content_demo_long_title' });
  } finally {
    card.detach();
  }
});

test('ab-art-card moves to an explicit fallback and emits imageerror after the bound image error', async () => {
  const card = render(['components', 'ab-art-card'], 'ab-art-card-error', {
    contentId: 'content_demo_image_error',
    title: '图片失败演示',
    summary: '加载失败后不以未授权图片替代。',
    categoryLabel: '古董 / ANTIQUE',
    creatorName: 'Demo Institution',
    cityName: '巴黎 / Paris',
    recordOrigin: 'SYNTHETIC',
    evidenceScope: 'DEMO_ONLY',
    imageUrl: 'https://assets.invalid/not-loaded.jpg',
    alt: '演示图片加载失败',
    imageAllowed: true,
  });
  try {
    assert.equal(card.data.showImage, true);
    let failure;
    card.addEventListener('imageerror', (event) => { failure = event.detail; });
    const image = card.querySelector('.art-card__image');
    assert.ok(image, 'allowed image branch should render before the error');
    image.dispatchEvent('error');
    await nextEventLoop();
    assert.equal(card.data.imageFailed, true);
    assert.equal(card.data.showImage, false);
    assert.deepEqual(failure, {
      contentId: 'content_demo_image_error',
      alt: '演示图片加载失败',
    });
    assert.match(card.dom.textContent, /暂无可公开展示的图片/);
  } finally {
    card.detach();
  }
});

test('ab-content-source renders the missing-source state and emits sourcecopy only for a URL', async () => {
  const missing = render(['components', 'ab-content-source'], 'ab-content-source-missing', {
    sourceTitle: '', sourceUrl: '', recordOrigin: 'SYNTHETIC', evidenceScope: 'DEMO_ONLY',
  });
  try {
    assert.match(missing.dom.textContent, /来源信息不可用/);
    assert.match(missing.dom.textContent, /缺少来源链接/);
    assert.equal(missing.querySelector('.source__copy'), undefined);
    let missingEventCount = 0;
    missing.addEventListener('sourcecopy', () => { missingEventCount += 1; });
    missing.instance.handleCopy();
    assert.equal(missingEventCount, 0);
  } finally {
    missing.detach();
  }

  const sourceUrl = 'https://example.invalid/public-source/very-long-reference?record=synthetic-demo-only';
  const present = render(['components', 'ab-content-source'], 'ab-content-source-present', {
    sourceTitle: '脱敏公开来源 / Redacted Public Source',
    sourceUrl,
    recordOrigin: 'SYNTHETIC',
    evidenceScope: 'DEMO_ONLY',
  });
  try {
    let copied;
    present.addEventListener('sourcecopy', (event) => { copied = event.detail; });
    present.querySelector('.source__copy').dispatchEvent('tap');
    await nextEventLoop();
    assert.deepEqual(copied, { sourceUrl });
    assert.match(present.dom.textContent, /Redacted Public Source/);
    assert.match(present.dom.textContent, /DEMO_ONLY/);
  } finally {
    present.detach();
  }
});

test('ab-provenance-summary keeps source, editorial review, image rights and platform position separate', () => {
  const platformStatement = '平台仅展示资料和第三方报告引用；不提供真伪鉴定结论，不承诺保值、收益或官方合作。';
  const summary = render(['components', 'ab-provenance-summary'], 'ab-provenance-summary', {
    sourceTitle: 'Extremely Long Bilingual Source Title / 用于验证超长来源名称的脱敏公开资料标题',
    sourceUrl: 'https://example.invalid/source/record-demo',
    recordOrigin: 'SYNTHETIC',
    evidenceScope: 'DEMO_ONLY',
    publicationState: 'PUBLISHED',
    reviewedAt: '2026-08-27T08:00:00.000Z',
    rightsStatus: 'CLAIMED',
    rightsReviewedAt: '',
    platformStatement,
  });
  try {
    const text = summary.dom.textContent;
    for (const heading of ['来源 / Source', '内容审核 / Editorial Review', '图片权利 / Image Rights', '平台说明 / Platform Position']) {
      assert.match(text, new RegExp(heading.replace('/', '\\/')));
    }
    assert.match(text, /PUBLISHED/);
    assert.match(text, /CLAIMED/);
    assert.match(text, /未单独提供/);
    assert.match(text, /不提供真伪鉴定结论/);

    let forwarded;
    summary.addEventListener('sourcecopy', (event) => { forwarded = event.detail; });
    summary.instance.handleSourceCopy({ detail: { sourceUrl: 'https://example.invalid/source/record-demo' } });
    assert.deepEqual(forwarded, { sourceUrl: 'https://example.invalid/source/record-demo' });
  } finally {
    summary.detach();
  }
});

test('ab-intent-action emits intent events but suppresses them while loading, disabled or missing content', async () => {
  const create = render(['components', 'ab-intent-action'], 'ab-intent-action-create', {
    contentId: 'content_demo_intent', state: 'NONE', loading: false, disabled: false,
    createLabel: '预约品鉴或提交合作意向', cancelLabel: '取消当前意向',
  });
  try {
    let created;
    create.addEventListener('intentcreate', (event) => { created = event.detail; });
    create.querySelector('.intent-action__button').dispatchEvent('tap');
    await nextEventLoop();
    assert.deepEqual(created, { contentId: 'content_demo_intent' });
    assert.match(create.dom.textContent, /意向不是订单/);
    assert.match(create.dom.textContent, /不锁定库存/);
  } finally {
    create.detach();
  }

  const cancel = render(['components', 'ab-intent-action'], 'ab-intent-action-cancel', {
    contentId: 'content_demo_intent', state: 'ACTIVE', loading: false, disabled: false,
  });
  try {
    assert.equal(cancel.data.isActive, true);
    let cancelled;
    cancel.addEventListener('intentcancel', (event) => { cancelled = event.detail; });
    cancel.querySelector('.intent-action__button').dispatchEvent('tap');
    await nextEventLoop();
    assert.deepEqual(cancelled, { contentId: 'content_demo_intent' });
  } finally {
    cancel.detach();
  }

  for (const properties of [
    { contentId: 'content_demo_intent', state: 'NONE', loading: true, disabled: false },
    { contentId: 'content_demo_intent', state: 'NONE', loading: false, disabled: true },
    { contentId: '', state: 'NONE', loading: false, disabled: false },
  ]) {
    const suppressed = render(['components', 'ab-intent-action'], 'ab-intent-action-suppressed', properties);
    try {
      let count = 0;
      suppressed.addEventListener('intentcreate', () => { count += 1; });
      suppressed.instance.handleCreate();
      assert.equal(count, 0, JSON.stringify(properties));
    } finally {
      suppressed.detach();
    }
  }
});

test('art-page-state renders weak-network, empty and error branches and only retries when allowed', async () => {
  const weak = render(['packageArt', 'components', 'art-page-state'], 'art-page-state-weak', {
    kind: 'LOADING', title: '正在读取公开内容', description: '保留当前筛选。', weakNetwork: true, retryable: false,
  });
  try {
    assert.match(weak.dom.textContent, /网络响应较慢/);
    assert.match(weak.dom.textContent, /不会切换到演示数据/);
    assert.equal(weak.querySelector('.page-state__retry'), undefined);
  } finally {
    weak.detach();
  }

  const empty = render(['packageArt', 'components', 'art-page-state'], 'art-page-state-empty', {
    kind: 'EMPTY', title: '当前分类暂无可公开内容', description: '草稿、审核中和已归档记录不会出现在列表中。', weakNetwork: false, retryable: false,
  });
  try {
    assert.match(empty.dom.textContent, /暂无可公开内容/);
    assert.match(empty.dom.textContent, /已归档记录不会出现/);
  } finally {
    empty.detach();
  }

  const error = render(['packageArt', 'components', 'art-page-state'], 'art-page-state-error', {
    kind: 'ERROR', title: '暂时无法读取', description: '请稍后重试。', weakNetwork: false, retryable: true,
  });
  try {
    let retried;
    error.addEventListener('retry', (event) => { retried = event.detail; });
    error.querySelector('.page-state__retry').dispatchEvent('tap');
    await nextEventLoop();
    assert.deepEqual(retried, { kind: 'ERROR' });
  } finally {
    error.detach();
  }
});
