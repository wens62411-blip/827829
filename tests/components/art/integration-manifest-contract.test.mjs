import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const readJson = (relativePath) => JSON.parse(
  readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8'),
);
const schema = readJson('integration/manifests/schema.json');
const manifest = readJson('integration/manifests/art.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

test('art integration manifest validates against the frozen 1.0.0 schema', () => {
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.equal(manifest.module, 'art');
  assert.equal(manifest.phase, 'FEATURE_MODULE');
  assert.equal(manifest.contractVersion, '1.0.0');
  assert.ok(['INCOMPLETE', 'BLOCKED', 'LOCAL_TEST_PASS'].includes(manifest.overall));
});

test('a feature manifest cannot promote itself above LOCAL_TEST_PASS', () => {
  const invalid = structuredClone(manifest);
  invalid.overall = 'INTEGRATION_READY';
  invalid.gates.local.status = 'PASS';
  invalid.gates.local.evidence = ['local command exited 0'];
  invalid.gates.devtoolsPreview.status = 'PASS';
  invalid.gates.devtoolsPreview.evidence = ['forged feature-owned preview evidence'];
  assert.equal(validate(invalid), false);
});

test('all non-local art gates remain UNVERIFIED', () => {
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release']) {
    assert.equal(manifest.gates[gate].status, 'UNVERIFIED', gate);
    assert.ok(manifest.gates[gate].evidence.length > 0, gate);
  }
});

test('homepage entry is requested only through the integration manifest', () => {
  const request = manifest.checks.find((check) => check.id === 'homepage-art-entry-request');
  assert.ok(request);
  assert.equal(request.status, 'PASS');
  assert.match(request.evidence, /^MANIFEST_REQUEST:/);
  assert.match(request.evidence, /\/packageArt\/pages\/channel\/index/);
  assert.match(request.evidence, /did not edit app\.json or pages\/discover/);
  assert.equal(manifest.artifacts.includes('miniprogram/app.json'), false);
  assert.equal(manifest.artifacts.some((artifact) => artifact.startsWith('miniprogram/pages/discover')), false);
});

test('LOCAL_STATIC_RENDER screenshots cannot upgrade preview or device evidence', () => {
  const screenshotCheck = manifest.checks.find((check) => check.id === 'local-static-screenshots');
  assert.ok(screenshotCheck);
  assert.match(screenshotCheck.evidence, /LOCAL_STATIC_RENDER/);
  assert.match(screenshotCheck.evidence, /not .*Developer Tools|not be represented as Developer Tools/i);

  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice']) {
    const evidence = manifest.gates[gate].evidence.join(' ');
    assert.doesNotMatch(evidence, /LOCAL_STATIC_RENDER|tests\/components\/art\/screenshots|\.png/i);
  }
});
