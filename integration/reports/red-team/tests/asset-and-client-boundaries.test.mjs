import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path) => readFileSync(join(root, path));
const text = (path) => read(path).toString('utf8');

test('all declared city, Discover hero and art fallback hashes match their local assets', () => {
  const cities = JSON.parse(text('miniprogram/assets/manifests/cities.json'));
  for (const city of cities.assets) {
    const runtimePath = cities.pathTemplate.replace('{cityId}', city.cityId).replace(/^\//, '');
    const actual = createHash('sha256').update(read(join('miniprogram', runtimePath))).digest('hex');
    assert.equal(actual, city.sha256, city.cityId);
  }
  const art = JSON.parse(text('miniprogram/assets/manifests/art.json'));
  for (const asset of art.assets) {
    const actual = createHash('sha256').update(read(join('miniprogram', asset.path.replace(/^\//, '')))).digest('hex');
    assert.equal(actual, asset.sha256, asset.assetId);
  }
  const hero = JSON.parse(text('miniprogram/assets/manifests/hero.json'));
  const heroHash = createHash('sha256')
    .update(read(join('miniprogram', hero.asset.path.replace(/^\//, ''))))
    .digest('hex');
  assert.equal(heroHash, hero.asset.sha256, hero.asset.assetId);
});

test('[P1][OPEN] every city photo and the Discover hero remain DRAFT pending human rights review', () => {
  const manifest = JSON.parse(text('miniprogram/assets/manifests/cities.json'));
  assert.equal(manifest.evidenceStatus, 'LICENSE_SOURCE_VERIFIED_HUMAN_REVIEW_PENDING');
  assert.equal(manifest.assets.length, 13);
  for (const asset of manifest.assets) {
    assert.equal(manifest.rightsProfile.rightsState, 'CLAIMED', asset.cityId);
    assert.equal(manifest.rightsProfile.reviewStatus, 'DRAFT', asset.cityId);
    assert.equal(manifest.rightsProfile.publicationPolicy, 'HUMAN_RIGHTS_REVIEW_REQUIRED', asset.cityId);
  }

  const hero = JSON.parse(text('miniprogram/assets/manifests/hero.json'));
  assert.equal(hero.evidenceStatus, 'LICENSE_SOURCE_VERIFIED_HUMAN_REVIEW_PENDING');
  assert.equal(hero.asset.rightsState, 'CLAIMED');
  assert.equal(hero.asset.reviewStatus, 'DRAFT');
  assert.equal(hero.asset.publicationPolicy, 'HUMAN_RIGHTS_REVIEW_REQUIRED');
});

test('[P1][OPEN] Discover renders DRAFT city assets without per-image attribution fields', () => {
  const manifest = JSON.parse(text('miniprogram/assets/manifests/cities.json'));
  const source = text('miniprogram/pages/discover/index.ts');
  const template = text('miniprogram/pages/discover/index.wxml');
  for (const cityId of ['cn-hangzhou', 'ch-zurich', 'it-milan', 'au-sydney']) {
    assert.match(source, new RegExp(`/assets/cities/${cityId}\\.jpg`));
    const asset = manifest.assets.find((candidate) => candidate.cityId === cityId);
    assert.ok(asset, cityId);
    assert.equal(manifest.rightsProfile.reviewStatus, 'DRAFT');
    assert.equal(manifest.rightsProfile.attributionRequired, true);
  }
  assert.match(template, /正式发布前仍需完成人工版权复核/);
  assert.doesNotMatch(source, /author|license|sourceUrl|attribution/i);
  assert.doesNotMatch(template, /item\.(?:author|license|sourceUrl|attribution)/i);

  const hero = JSON.parse(text('miniprogram/assets/manifests/hero.json'));
  assert.equal(hero.asset.reviewStatus, 'DRAFT');
  assert.match(template, /src="\/assets\/hero\/zurich-960\.jpg"/);
  assert.doesNotMatch(template, /Beat Ruest|CC BY-SA 4\.0|creativecommons\.org/);
});

test('[P2][OPEN] interactive event controls override the 88rpx baseline with smaller targets', () => {
  const eventLanding = text('miniprogram/pages/events/index.wxss');
  const eventDetail = text('miniprogram/packageEvents/pages/event/index.wxss');
  assert.match(eventLanding, /\.scope__action[\s\S]*?min-height:\s*72rpx/);
  assert.match(eventDetail, /\.text-action[\s\S]*?min-height:\s*76rpx/);
  assert.match(text('miniprogram/pages/events/index.wxml'), /<button[^>]*scope__action/);
  assert.match(text('miniprogram/packageEvents/pages/event/index.wxml'), /<button[^>]*text-action/);
});

test('[P2][OPEN] reduced-motion override no longer covers all rendered element types', () => {
  const globalStyles = text('miniprogram/app.wxss');
  const reducedMotion = globalStyles.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.equal(typeof reducedMotion, 'string');
  assert.match(reducedMotion, /page,\s*view,\s*button,\s*image/);
  assert.doesNotMatch(reducedMotion, /\*/);
  assert.doesNotMatch(reducedMotion, /(?:^|,)\s*(?:text|navigator|picker)(?:\s*,|\s*\{)/);

  const rendered = [
    text('miniprogram/pages/discover/index.wxml'),
    text('miniprogram/pages/events/index.wxml'),
    text('miniprogram/pages/network/index.wxml'),
  ].join('\n');
  for (const tag of ['text', 'navigator', 'picker']) assert.match(rendered, new RegExp(`<${tag}\\b`));
});
