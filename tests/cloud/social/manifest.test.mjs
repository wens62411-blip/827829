import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { root } from './helpers.mjs';

const readJson = (...parts) => JSON.parse(readFileSync(join(root, ...parts), 'utf8'));

test('social-review manifest uses frozen overall + gates schema and preserves the local-only ceiling', () => {
  const schema = readJson('integration', 'manifests', 'schema.json');
  const manifest = readJson('integration', 'manifests', 'social-review.json');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  assert.equal(validate(manifest), true, JSON.stringify(validate.errors));
  assert.equal(manifest.module, 'social-review');
  assert.equal(manifest.phase, 'FEATURE_MODULE');
  assert.equal(manifest.contractVersion, '1.0.0');
  assert.ok(['INCOMPLETE', 'BLOCKED', 'LOCAL_TEST_PASS'].includes(manifest.overall));
  if (manifest.overall === 'LOCAL_TEST_PASS') {
    assert.equal(manifest.gates.local.status, 'PASS');
    assert.ok(manifest.gates.local.evidence.some((entry) => /exit(?:ed| code)?\s*0/i.test(entry)),
      'local PASS must cite a command exit code 0');
  }
  for (const gate of ['devtoolsPreview', 'iosDevice', 'androidDevice', 'devVersionUpload', 'release']) {
    assert.notEqual(manifest.gates[gate].status, 'PASS',
      `${gate} cannot pass without external evidence in this feature module`);
  }
});

test('manifest names every required social-review evidence matrix without claiming admin/deployment proof', () => {
  const manifest = readJson('integration', 'manifests', 'social-review.json');
  const checkIds = new Set(manifest.checks.map((check) => check.id));
  for (const required of [
    'relationship-state-matrix',
    'tag-publication-matrix',
    'material-permission-negative-tests',
    'synthetic-redacted-fixtures',
    'owner-review-timeline-screenshot',
    'projection-invalidation',
    'cloud-social-tests',
  ]) {
    assert.ok(checkIds.has(required), `missing social evidence check ${required}`);
  }

  const serialized = JSON.stringify(manifest);
  assert.match(serialized, /SYNTHETIC/);
  assert.match(serialized, /DEMO_ONLY/);
  assert.match(serialized, /ReviewLog|review log/i);
  assert.match(serialized, /adminApi/);
  assert.match(serialized, /cards_public/);
  assert.match(serialized, /UNVERIFIED/);
  assert.doesNotMatch(serialized, /"overall"\s*:\s*"(?:INTEGRATION_READY|RELEASE_CANDIDATE|RELEASED)"/);
});
