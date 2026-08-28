import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const schema = JSON.parse(readFileSync(join(root, 'integration', 'manifests', 'schema.json'), 'utf8'));
const manifests = ['foundation', 'card', 'social-review', 'events', 'art', 'admin']
  .map((name) => JSON.parse(readFileSync(
    join(root, 'integration', 'manifests', `${name}.json`),
    'utf8',
  )));
const read = (path) => readFileSync(join(root, path), 'utf8');

function gates(status) {
  return Object.fromEntries([
    'local', 'devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release',
  ].map((key) => [key, { status, evidence: [`synthetic-${key}`] }]));
}

function minimalManifest(overrides = {}) {
  return {
    module: 'red-team-contract-fixture',
    phase: 'FEATURE_MODULE',
    contractVersion: '1.0.0',
    generatedAt: '2026-08-27T00:00:00.000Z',
    overall: 'LOCAL_TEST_PASS',
    gates: gates('PASS'),
    artifacts: ['integration/reports/red-team/tests/contract-drift.test.mjs'],
    checks: [{ id: 'synthetic', status: 'PASS', evidence: 'synthetic evidence' }],
    knownGaps: [],
    ...overrides,
  };
}

test('[P1][OPEN] all 02-06 manifests omit changedPaths because the schema forbids the field', () => {
  assert.equal(Object.hasOwn(schema.properties, 'changedPaths'), false);
  assert.equal(schema.additionalProperties, false);
  for (const manifest of manifests) assert.equal('changedPaths' in manifest, false, manifest.module);
});

test('[P1][OPEN] schema accepts feature and foundation phase/gate combinations that exceed their evidence ceiling', () => {
  const validate = new Ajv2020({ strict: false, allErrors: true }).compile(schema);
  assert.equal(validate(minimalManifest()), true, JSON.stringify(validate.errors));
  assert.equal(validate(minimalManifest({ overall: 'BLOCKED' })), true, JSON.stringify(validate.errors));
  assert.equal(validate(minimalManifest({ phase: 'FOUNDATION', overall: 'RELEASED' })), true, JSON.stringify(validate.errors));
});

test('[P2][OPEN] evidence schema cannot compile under Ajv strict mode', () => {
  assert.throws(
    () => new Ajv2020({ strict: true, allErrors: true }).compile(schema),
    /missing type "array" for keyword "minItems"/,
  );
});

test('[P1][OPEN] Discover performs final composition before a FINAL_INTEGRATION manifest exists', () => {
  const agents = read('AGENTS.md');
  const ownership = read('docs/contracts/file-ownership.md');
  const source = read('miniprogram/pages/discover/index.ts');
  const template = read('miniprogram/pages/discover/index.wxml');

  assert.match(agents, /pages\/discover(?:\/\*\*)?[\s\S]*placeholder/i);
  assert.match(ownership, /pages\/discover(?:\/\*\*)?[\s\S]*placeholder/i);
  assert.doesNotMatch(source, /createPlaceholderPage/);
  for (const route of [
    '/pages/card/index',
    '/pages/network/index',
    '/pages/events/index',
    '/packageArt/pages/channel/index',
  ]) assert.match(template, new RegExp(route.replaceAll('/', '\\/')));
  assert.equal(manifests.some((manifest) => manifest.phase === 'FINAL_INTEGRATION'), false);
});

test('[P2][OPEN] Discover forks the frozen city directory into page and test literals', () => {
  const source = read('miniprogram/pages/discover/index.ts');
  const pageTest = read('tests/components/discover/home-page.test.mjs');
  assert.doesNotMatch(source, /CITY_DIRECTORY/);
  for (const city of [
    '北京', '上海', '广州', '深圳', '杭州', '苏黎世', '米兰',
    '巴黎', '新加坡', '墨尔本', '悉尼', '多伦多', '温哥华',
  ]) {
    assert.match(source, new RegExp(city));
    assert.match(pageTest, new RegExp(city));
  }
});
