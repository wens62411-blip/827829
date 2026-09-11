import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = resolve(import.meta.dirname, '../../..');
const template = readFileSync(resolve(root, 'miniprogram/components/ab-profile-card/index.wxml'), 'utf8');
let definition;
const compiled = buildSync({
  entryPoints: [resolve(root, 'miniprogram/components/ab-profile-card/index.ts')],
  bundle: true, platform: 'node', format: 'cjs', write: false, logLevel: 'silent',
});
runInNewContext(compiled.outputFiles[0].text, { Component(value) { definition = value; } });

function component(properties) {
  const defaults = Object.fromEntries(Object.entries(definition.properties).map(([key, value]) => [key, structuredClone(value.value)]));
  const instance = {
    properties: { ...defaults, ...properties },
    data: structuredClone(definition.data),
    ...definition.methods,
    setData(patch) { Object.assign(this.data, patch); },
  };
  definition.lifetimes.attached.call(instance);
  return instance;
}

function openingTag(label) {
  const tag = [...template.matchAll(/<view\b[^>]*>/g)].find(([value]) => value.includes(`aria-label="${label}"`))?.[0];
  assert.ok(tag, `missing section ${label}`);
  return tag;
}

function shown(tag, bindings) {
  const expression = tag.match(/wx:if="\{\{([^"]+)\}\}"/)?.[1];
  assert.ok(expression, 'the section should explicitly guard visibility');
  return Boolean(runInNewContext(expression, bindings));
}

test('concise editor preview is opt-in and suppresses only its redundant visible captions', () => {
  assert.equal(definition.properties.concisePreview.value, false);
  for (const className of ['profile-card__edition-meta', 'profile-card__viewer', 'profile-card__eyebrow']) {
    const tag = [...template.matchAll(/<text\b[^>]*>/g)].find(([value]) => value.includes(`class="${className}"`))?.[0];
    assert.ok(tag);
    assert.equal(shown(tag, { concisePreview: false }), true);
    assert.equal(shown(tag, { concisePreview: true }), false);
  }
  assert.match(template, /concisePreview \? '自定义标签' : '人物标签'/);
  assert.match(template, /wx:if="\{\{!concisePreview\}\}"[^>]*>本人自定义 · 未经人工认证/);
  assert.match(template, /aria-label="公开个人标签，未经人工认证"/);
});

test('empty self labels and gallery disappear only in the concise editor preview', () => {
  const labels = openingTag('本人自选标签，未经人工认证');
  const gallery = openingTag('本人图片预览');
  for (const [tag, key] of [[labels, 'safeSelectedLabels'], [gallery, 'safeGallery']]) {
    assert.equal(shown(tag, { isSelf: true, concisePreview: false, [key]: [] }), true);
    assert.equal(shown(tag, { isSelf: true, concisePreview: true, [key]: [] }), false);
    assert.equal(shown(tag, { isSelf: true, concisePreview: true, [key]: ['item'] }), true);
    assert.equal(shown(tag, { isSelf: false, concisePreview: true, [key]: ['item'] }), false);
    assert.equal(shown(tag, { isSelf: false, concisePreview: false, [key]: ['item'] }), false);
  }
  assert.match(template, /concisePreview \? '自选标签 · 未发布' : '我的标签'/);
  assert.match(template, /concisePreview \? '图片 · 本机预览' : '图片'/);
});

test('concise mode cannot change card data, contact permissions, tag approval or self-only gallery filtering', () => {
  const inputs = {
    card: {
      displayName: '测试人物', biography: '自己的介绍',
      claims: [{ labelText: { zh: '未审核身份' }, reviewStatus: 'PENDING', verificationState: 'USER_DECLARED', publicVisible: true }],
    },
    fields: [{ key: 'phone', value: '13800138000' }, { key: 'profession', value: '策展人' }],
    publicLabels: ['艺术', '伪造\n标签', '艺术'],
    selectedLabels: ['自选内容'],
    galleryUrls: ['wxfile://local-preview', 'https://example.test/gallery.jpg'],
  };
  for (const viewerMode of ['SELF', 'FRIEND', 'STRANGER']) {
    for (const allowPublicContacts of [false, true]) {
      const full = component({ ...inputs, viewerMode, allowPublicContacts });
      const concise = component({ ...inputs, viewerMode, allowPublicContacts, concisePreview: true });
      assert.deepEqual(structuredClone(concise.data), structuredClone(full.data));
      assert.equal(concise.data.safeClaims.length, 0, 'self-defined labels must not become verified claims');
      assert.deepEqual([...concise.data.safePublicLabels], ['艺术']);
      assert.equal(concise.data.safeFields.some((field) => field.key === 'phone'), allowPublicContacts);
      assert.equal(concise.data.safeGallery.length > 0, viewerMode === 'SELF');
      assert.equal(concise.data.safeSelectedLabels.length > 0, viewerMode === 'SELF');
    }
  }
});
