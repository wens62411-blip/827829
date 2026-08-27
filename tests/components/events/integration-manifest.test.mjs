import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const readJson = (relativePath) => JSON.parse(
  readFileSync(new URL(`../../../${relativePath}`, import.meta.url), 'utf8'),
);
const schema = readJson('integration/manifests/schema.json');
const manifest = readJson('integration/manifests/events.json');
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

test('events integration manifest is schema-valid and stays at the feature-local ceiling', () => {
  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.equal(manifest.module, 'events');
  assert.equal(manifest.phase, 'FEATURE_MODULE');
  assert.equal(manifest.contractVersion, '1.0.0');
  assert.equal(manifest.overall, 'LOCAL_TEST_PASS');
  assert.equal(manifest.gates.local.status, 'PASS');
});

test('local evidence never upgrades Developer Tools, device, upload or release gates', () => {
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release']) {
    assert.equal(manifest.gates[gate].status, 'UNVERIFIED', gate);
    assert.ok(manifest.gates[gate].evidence.length > 0, gate);
  }
});

test('content, production adapter and payment boundaries remain explicit', () => {
  assert.ok(manifest.knownGaps.includes('CONTENT_LIVE_UNVERIFIED'));
  assert.match(manifest.knownGaps.join('\n'), /default eventApi main is intentionally NOT_IMPLEMENTED/);
  assert.match(manifest.knownGaps.join('\n'), /CloudBase database adapter.*UNVERIFIED/);
  const content = manifest.checks.find(({ id }) => id === 'content-live');
  const endpoint = manifest.checks.find(({ id }) => id === 'api-production-entrypoint');
  const payment = manifest.checks.find(({ id }) => id === 'payment-gate');
  assert.equal(content?.status, 'UNVERIFIED');
  assert.match(content?.evidence ?? '', /CONTENT_LIVE_UNVERIFIED/);
  assert.equal(endpoint?.status, 'UNVERIFIED');
  assert.equal(payment?.status, 'PASS');
  assert.match(payment?.evidence ?? '', /no payment button|no.*wx\.requestPayment/i);
});

test('local screenshots are not represented as preview or device evidence', () => {
  const screenshot = manifest.checks.find(({ id }) => id === 'ui-screenshots');
  assert.equal(screenshot?.status, 'PASS');
  assert.match(screenshot?.evidence ?? '', /LOCAL_RENDER_SCREENSHOT/);
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice']) {
    assert.doesNotMatch(manifest.gates[gate].evidence.join(' '), /LOCAL_RENDER_SCREENSHOT|\.jpg/i);
  }
});
